import type { DefiAdministreApi, DefisApi } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import {
  creation,
  defi,
  mouvementReputation,
  notification,
  outil,
  participation as participationDefi,
  vote,
} from '../src/db/schema/index.js';
import {
  confirmerIdentite,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;
const JOUR = 86_400_000;

describe('Gestion des défis (S-07, EC-24, F-63, F-65)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, email);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    ip = ipDeTest();
    await vider(
      contexte.db,
      'utilisateur',
      'contenu',
      'defi',
      'mouvement_reputation',
      'journal_audit',
    );
  });
  afterAll(async () => {
    await vider(
      contexte.db,
      'utilisateur',
      'contenu',
      'defi',
      'mouvement_reputation',
      'journal_audit',
    );
    await contexte.app.close();
  });

  it('clôture un défi commencé avant sa fin, jamais un défi à venir ; un membre ne modifie rien', async () => {
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    const awa = await creerMembre(contexte);
    const lea = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const admin = await agentConnecte('claire@example.com');
    const membre = await agentConnecte('awa.sarr@example.com');
    const saisie = (debut: Date, fin: Date) => ({
      titre: 'Deploy Friday',
      enonce: 'Faites-en un jeu de plateforme ou un runner, en un seul prompt.',
      dateDebut: debut.toISOString(),
      dateFin: fin.toISOString(),
    });
    const publier = async (debut: Date, fin: Date) => {
      const cree = (await admin.post('/api/v1/admin/defis').send(saisie(debut, fin)).expect(201))
        .body as DefiAdministreApi;
      return (await admin.post(`/api/v1/admin/defis/${cree.id}/publication`).expect(200))
        .body as DefiAdministreApi;
    };

    // À venir : il s'annule, il ne se clôture pas ; un membre ne le modifie pas.
    const demain = new Date(Date.now() + JOUR);
    const aVenir = await publier(demain, new Date(demain.getTime() + 7 * JOUR));
    expect(aVenir.actions).toEqual(['ouvrir', 'annuler']);
    expect(
      (await admin.post(`/api/v1/admin/defis/${aVenir.id}/cloture`).expect(409)).body.detail,
    ).toMatch(/publié et commencé/);
    await membre
      .patch(`/api/v1/admin/defis/${aVenir.id}`)
      .send(saisie(demain, new Date(demain.getTime() + 3 * JOUR)))
      .expect(403);
    await membre.post(`/api/v1/admin/defis/${aVenir.id}/cloture`).expect(403);
    await membre.post(`/api/v1/admin/defis/${aVenir.id}/pause`).expect(403);

    // S-17 : ouvert maintenant, il commence aussitôt (sa fin ne change pas) ; annulé, il se rétablit.
    const ouvert = (await admin.post(`/api/v1/admin/defis/${aVenir.id}/ouverture`).expect(200))
      .body as DefiAdministreApi;
    expect(ouvert.actions).toEqual(['pause', 'cloturer', 'annuler']);
    expect(new Date(ouvert.dateDebut).getTime()).toBeLessThanOrEqual(Date.now());
    expect(ouvert.dateFin).toBe(aVenir.dateFin);
    await admin.post(`/api/v1/admin/defis/${aVenir.id}/ouverture`).expect(409);
    const annule = (await admin.post(`/api/v1/admin/defis/${aVenir.id}/annulation`).expect(200))
      .body as DefiAdministreApi;
    expect(annule.actions).toEqual(['retablir']);
    expect(
      (await admin.post(`/api/v1/admin/defis/${aVenir.id}/retablissement`).expect(200)).body,
    ).toMatchObject({ statut: 'PUBLIE' });
    await admin.post(`/api/v1/admin/defis/${aVenir.id}/annulation`).expect(200);

    // En cours depuis deux jours, fin dans cinq : clôturé maintenant, la fin devient la clôture.
    const debut = new Date(Date.now() - 2 * JOUR);
    const fin = new Date(Date.now() + 5 * JOUR);
    const enCours = await publier(debut, fin);
    expect(enCours.actions).toEqual(['pause', 'cloturer', 'annuler']);
    const [deAwa, deLea] = await Promise.all(
      [awa, lea].map(async (m) => {
        const id = await creerCreation(contexte, m.id);
        await contexte.db.update(creation).set({ defiId: enCours.id }).where(eq(creation.id, id));
        return id;
      }),
    );
    await contexte.db.insert(vote).values({
      votantId: awa.id,
      contenuId: deLea!,
      typeVoteCode: 'UTILE',
      dateVote: new Date(Date.now() - 3_600_000),
    });

    // S-17 : en pause, plus aucune inscription ; la page l'indique ; puis reprise.
    const enPause = (await admin.post(`/api/v1/admin/defis/${enCours.id}/pause`).expect(200))
      .body as DefiAdministreApi;
    expect(enPause.actions).toEqual(['reprendre', 'cloturer', 'annuler']);
    expect(enPause.pauseDepuis).not.toBeNull();
    await admin.post(`/api/v1/admin/defis/${enCours.id}/pause`).expect(409);
    const page = (await request(serveur()).get(`/api/v1/defis?defi=${enCours.id}`).expect(200))
      .body as DefisApi;
    expect(page.defi?.enPause).toBe(true);
    await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const kofi = await agentConnecte('kofi@example.com');
    const [o] = await contexte.db.select({ id: outil.id }).from(outil).limit(1);
    const participation = {
      titre: 'L’ascenseur est en panne',
      idee: 'Douze étages à gravir en rebondissant de bureau en bureau.',
      outilId: o!.id,
      prompts: ['Crée un jeu HTML jouable dans le navigateur, tout dans un seul fichier.'],
      jeu: { nom: 'jeu.html', html: '<body><canvas></canvas></body>' },
    };
    expect(
      (
        await kofi
          .post(`/api/v1/defis/${enCours.id}/participations`)
          .send(participation)
          .expect(409)
      ).body.detail,
    ).toMatch(/en pause/);
    const repris = (await admin.delete(`/api/v1/admin/defis/${enCours.id}/pause`).expect(200))
      .body as DefiAdministreApi;
    expect(repris).toMatchObject({ pauseDepuis: null, actions: ['pause', 'cloturer', 'annuler'] });
    // Reprise : la participation est acceptée ; elle sera classée avec les créations d'avant.
    const deKofi = (
      (
        await kofi
          .post(`/api/v1/defis/${enCours.id}/participations`)
          .send(participation)
          .expect(201)
      ).body as { id: number }
    ).id;

    const clos = (await admin.post(`/api/v1/admin/defis/${enCours.id}/cloture`).expect(200))
      .body as DefiAdministreApi;
    expect(clos).toMatchObject({ statut: 'CLOTURE', actions: [] });
    expect(new Date(clos.dateFin).getTime()).toBeLessThan(fin.getTime());
    expect(Math.abs(new Date(clos.dateFin).getTime() - Date.now())).toBeLessThan(120_000);
    const rangs = await contexte.db
      .select({ id: creation.id, rang: creation.rangFinalParticipation })
      .from(creation)
      .where(eq(creation.defiId, enCours.id));
    expect(Object.fromEntries(rangs.map((r) => [r.id, r.rang]))).toEqual({
      [deLea!]: 1,
      [deAwa!]: 2,
    });
    const [rangKofi] = await contexte.db
      .select({ rang: participationDefi.rangFinal })
      .from(participationDefi)
      .where(eq(participationDefi.id, deKofi));
    expect(rangKofi?.rang).toBe(3);
    await admin.post(`/api/v1/admin/defis/${enCours.id}/cloture`).expect(409);
  });

  it('crée, publie puis clôture un défi : classement figé, points et notifications', async () => {
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    const awa = await creerMembre(contexte);
    const lea = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const kofi = await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const admin = await agentConnecte('claire@example.com');
    const membre = await agentConnecte('awa.sarr@example.com');
    await membre.get('/api/v1/admin/defis').expect(403);

    const debut = new Date(Date.now() - JOUR);
    const fin = new Date(Date.now() + 2 * JOUR);
    expect(
      (
        await admin
          .post('/api/v1/admin/defis')
          .send({
            titre: 'Un logo lisible',
            enonce: 'Créez un logo lisible en petit format.',
            dateDebut: debut.toISOString(),
            dateFin: new Date(debut.getTime() + 40 * JOUR).toISOString(),
          })
          .expect(400)
      ).body.erreurs.dateFin,
    ).toBe('Un défi dure de 1 à 30 jours.');
    const cree = (
      await admin
        .post('/api/v1/admin/defis')
        .send({
          titre: 'Un logo lisible',
          enonce: 'Créez un logo lisible en petit format.',
          contraintes: 'Deux couleurs au plus\nLisible à 32 pixels',
          dateDebut: debut.toISOString(),
          dateFin: fin.toISOString(),
        })
        .expect(201)
    ).body as DefiAdministreApi;
    expect(cree).toMatchObject({
      statut: 'BROUILLON',
      slug: 'un-logo-lisible',
      actions: ['publier', 'annuler'],
    });
    expect((await request(serveur()).get('/api/v1/defis').expect(200)).body.defi).toBeNull();
    const publie = (await admin.post(`/api/v1/admin/defis/${cree.id}/publication`).expect(200))
      .body as DefiAdministreApi;
    // Commencé, il se clôture dès que l'administration le décide (décision du 2026-11-16).
    expect(publie).toMatchObject({ statut: 'PUBLIE', actions: ['pause', 'cloturer', 'annuler'] });
    await admin.post(`/api/v1/admin/defis/${cree.id}/publication`).expect(409);

    // Publié et commencé, il se modifie encore, dates comprises (1 à 30 jours).
    const prolonge = new Date(fin.getTime() + 2 * JOUR);
    const modifie = (
      await admin
        .patch(`/api/v1/admin/defis/${cree.id}`)
        .send({
          titre: 'Un logo lisible en petit',
          enonce: 'Créez un logo lisible en petit format.',
          contraintes: 'Deux couleurs au plus',
          dateDebut: debut.toISOString(),
          dateFin: prolonge.toISOString(),
          definition: 'Un logo qui se lit encore à la taille d’une icône.',
          cases: [
            { chiffre: '2', intitule: 'couleurs au plus', precision: 'Fond compris' },
            { chiffre: '32', intitule: 'pixels', precision: '' },
          ],
          criteres: [{ icone: 'grid', libelle: 'Lisibilité' }],
          criteresCommuns: ['Rendu visuel'],
        })
        .expect(200)
    ).body as DefiAdministreApi;
    expect(modifie).toMatchObject({
      titre: 'Un logo lisible en petit',
      slug: 'un-logo-lisible',
      dateFin: prolonge.toISOString(),
      definition: 'Un logo qui se lit encore à la taille d’une icône.',
      cases: [
        { chiffre: '2', intitule: 'couleurs au plus', precision: 'Fond compris' },
        { chiffre: '32', intitule: 'pixels', precision: null },
      ],
      criteres: [{ icone: 'grid', libelle: 'Lisibilité' }],
      criteresCommuns: ['Rendu visuel'],
    });
    const publique = (await request(serveur()).get(`/api/v1/defis?defi=${cree.id}`).expect(200))
      .body as DefisApi;
    expect(publique.defi).toMatchObject({
      definition: 'Un logo qui se lit encore à la taille d’une icône.',
      criteres: [{ icone: 'grid', libelle: 'Lisibilité' }],
      enPause: false,
    });
    await admin
      .patch(`/api/v1/admin/defis/${cree.id}`)
      .send({
        titre: 'Un logo lisible',
        enonce: 'Créez un logo lisible en petit format.',
        dateDebut: debut.toISOString(),
        dateFin: fin.toISOString(),
        criteres: [{ icone: 'inconnue', libelle: 'Lisibilité' }],
      })
      .expect(400);
    expect(
      (
        await admin
          .patch(`/api/v1/admin/defis/${cree.id}`)
          .send({
            titre: 'Un logo lisible',
            enonce: 'Créez un logo lisible en petit format.',
            dateDebut: debut.toISOString(),
            dateFin: new Date(debut.getTime() + 40 * JOUR).toISOString(),
          })
          .expect(400)
      ).body.erreurs.dateFin,
    ).toBe('Un défi dure de 1 à 30 jours.');

    // Trois participations : Léa reçoit deux votes pendant le défi, Kofi un, Awa aucun.
    const participations = await Promise.all(
      [awa, lea, kofi].map(async (m) => {
        const id = await creerCreation(contexte, m.id);
        await contexte.db.update(creation).set({ defiId: cree.id }).where(eq(creation.id, id));
        return id;
      }),
    );
    const [deAwa, deLea, deKofi] = participations as [number, number, number];
    await contexte.db.insert(vote).values([
      { votantId: awa.id, contenuId: deLea, typeVoteCode: 'UTILE' },
      { votantId: kofi.id, contenuId: deLea, typeVoteCode: 'UTILE' },
      { votantId: awa.id, contenuId: deKofi, typeVoteCode: 'UTILE' },
    ]);
    // Le défi est terminé : il se clôture.
    await contexte.db
      .update(defi)
      .set({ dateDebut: new Date(Date.now() - 5 * JOUR), dateFin: new Date(Date.now() - 60_000) })
      .where(eq(defi.id, cree.id));
    await contexte.db.update(vote).set({ dateVote: new Date(Date.now() - 2 * JOUR) });
    const clos = (await admin.post(`/api/v1/admin/defis/${cree.id}/cloture`).expect(200))
      .body as DefiAdministreApi;
    expect(clos).toMatchObject({ statut: 'CLOTURE', actions: [] });

    const rangs = await contexte.db
      .select({ id: creation.id, rang: creation.rangFinalParticipation })
      .from(creation)
      .where(eq(creation.defiId, cree.id));
    expect(Object.fromEntries(rangs.map((r) => [r.id, r.rang]))).toEqual({
      [deLea]: 1,
      [deKofi]: 2,
      [deAwa]: 3,
    });
    const points = async (id: number) =>
      (
        await contexte.db
          .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
          .from(mouvementReputation)
          .where(eq(mouvementReputation.beneficiaireId, id))
      ).toSorted((a, b) => a.motif.localeCompare(b.motif));
    expect(await points(lea.id)).toEqual([
      { motif: 'PARTICIPATION_DEFI', points: 5 },
      { motif: 'PODIUM_DEFI', points: 50 },
    ]);
    const [resultat] = await contexte.db
      .select({ donnees: notification.donnees })
      .from(notification)
      .where(and(eq(notification.destinataireId, awa.id), eq(notification.type, 'RESULTAT_DEFI')));
    expect(resultat?.donnees).toMatchObject({
      defiId: cree.id,
      rang: 3,
      participants: 3,
      points: 25,
    });

    const page = (await request(serveur()).get('/api/v1/defis').expect(200)).body as DefisApi;
    expect(page.termines[0]?.podium.map((p) => [p.rang, p.auteur.pseudo])).toEqual([
      [1, 'lea-martin'],
      [2, 'kofi-mensah'],
      [3, 'awa-sarr'],
    ]);
    await admin.post(`/api/v1/admin/defis/${cree.id}/annulation`).expect(409);
    // Clôturé, il ne se modifie plus.
    await admin
      .patch(`/api/v1/admin/defis/${cree.id}`)
      .send({
        titre: 'Un logo lisible',
        enonce: 'Créez un logo lisible en petit format.',
        dateDebut: debut.toISOString(),
        dateFin: fin.toISOString(),
      })
      .expect(409);
  });
});
