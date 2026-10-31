import type { DefiAdministreApi, DefisApi } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { creation, defi, mouvementReputation, notification, vote } from '../src/db/schema/index.js';
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
    expect(publie).toMatchObject({ statut: 'PUBLIE', actions: ['annuler'] });
    await admin.post(`/api/v1/admin/defis/${cree.id}/publication`).expect(409);

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
    expect(
      (await admin.post(`/api/v1/admin/defis/${cree.id}/cloture`).expect(409)).body.detail,
    ).toMatch(/date de fin passée/);

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
  });
});
