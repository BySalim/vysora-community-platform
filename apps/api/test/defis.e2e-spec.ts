import type { ContenuCreationSaisi, CreationFicheApi, DefisApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { categorie, creation, defi, outil, vote } from '../src/db/schema/index.js';
import {
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

describe('Défis (S-07, F-63 à F-65, RG-73 à RG-75)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let awaId: number;
  let leaId: number;
  let defiId: number;
  let outilId: number;
  let categorieId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const lire = async (agent: Agent | ReturnType<typeof request>) =>
    (await agent.get('/api/v1/defis').expect(200)).body as DefisApi;
  const participer = (agent: Agent, creationId: number, id = defiId) =>
    agent.put(`/api/v1/defis/${id}/participation`).send({ creationId });
  /** « 1 prompt » complet, publiable tel quel depuis l'éditeur. */
  const unPrompt = (valeurs: Partial<ContenuCreationSaisi> = {}): ContenuCreationSaisi => ({
    type: 'UN_PROMPT',
    titre: 'Affiche typographique de Gorée',
    objectif: 'Une affiche lisible, construite autour du nom du lieu.',
    categorieId,
    etapes: [
      {
        configurations: [{ outilId }],
        echanges: [
          {
            prompt: 'Affiche typographique de Gorée, bleu profond et blanc.',
            reponse: 'Voici une affiche verticale, le nom du lieu en grand.',
          },
        ],
      },
    ],
    ...valeurs,
  });
  const publier = (agent: Agent, id: number) =>
    agent.post(`/api/v1/creations/${id}/publication`).send({ confirmationDonnees: true });
  const periode = (debut: number, fin: number) =>
    contexte.db
      .update(defi)
      .set({
        dateDebut: new Date(Date.now() + debut * JOUR),
        dateFin: new Date(Date.now() + fin * JOUR),
      })
      .where(eq(defi.id, defiId));

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [o] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .limit(1);
    const [c] = await contexte.db
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.estActive, true))
      .limit(1);
    if (!o || !c) throw new Error('Référentiels absents');
    [outilId, categorieId] = [o.id, c.id];
  });
  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    awaId = (await creerMembre(contexte)).id;
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    const [cree] = await contexte.db
      .insert(defi)
      .values({
        organisateurId: awaId,
        titre: 'Une affiche touristique',
        slug: 'une-affiche-touristique',
        enonce: 'Créez l’affiche d’un lieu que vous aimez.',
        contraintes: '- Trois échanges au plus\n- Un lieu réel',
        dateDebut: new Date(Date.now() - 2 * JOUR),
        dateFin: new Date(Date.now() + 3 * JOUR),
        statut: 'PUBLIE',
      })
      .returning({ id: defi.id });
    defiId = cree!.id;
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    await contexte.app.close();
  });

  it('présente le défi en cours, jamais un brouillon', async () => {
    const d = await lire(request(serveur()));
    expect(d.defi).toMatchObject({
      id: defiId,
      etat: 'EN_COURS',
      regles: ['Trois échanges au plus', 'Un lieu réel'],
      participations: 0,
    });
    expect(d.moi).toBeNull();
    await contexte.db.update(defi).set({ statut: 'BROUILLON' }).where(eq(defi.id, defiId));
    expect((await lire(request(serveur()))).defi).toBeNull();
  });

  it('inscrit une création publiée pendant le défi, une par personne (RG-74), classée par votes (RG-75)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const premiere = await creerCreation(contexte, awaId);
    const seconde = await creerCreation(contexte, awaId);
    const ancienne = await creerCreation(contexte, awaId);
    await contexte.db
      .update(creation)
      .set({ datePublication: new Date(Date.now() - 5 * JOUR) })
      .where(eq(creation.id, ancienne));
    const deLea = await creerCreation(contexte, leaId);

    expect((await lire(awa)).moi?.eligibles.map((c) => c.id).toSorted()).toEqual(
      [premiere, seconde].toSorted(),
    );
    expect((await participer(awa, ancienne).expect(409)).body.detail).toMatch(/pendant la période/);
    expect((await participer(awa, deLea).expect(404)).body.detail).toMatch(/introuvable/);
    await participer(awa, premiere).expect(204);
    expect((await participer(awa, seconde).expect(409)).body.detail).toMatch(
      /une création par personne/,
    );
    expect((await lire(awa)).moi).toEqual({
      participation: { id: premiere, titre: 'Cité imaginaire entre ciel et mer' },
      eligibles: [],
    });

    const lea = await agentConnecte('lea@example.com');
    await participer(lea, deLea).expect(204);
    await contexte.db
      .insert(vote)
      .values({ votantId: awaId, contenuId: deLea, typeVoteCode: 'UTILE' });
    const d = await lire(lea);
    expect(d.participations.map((p) => [p.auteur.pseudo, p.utiles, p.monVote])).toEqual([
      ['lea-martin', 1, false],
      ['awa-sarr', 0, false],
    ]);

    await awa.delete(`/api/v1/defis/${defiId}/participation`).expect(204);
    expect((await lire(awa)).participations).toHaveLength(1);
    // Défi passé : les participations sont fermées.
    await contexte.db
      .update(defi)
      .set({ dateDebut: new Date(Date.now() - 10 * JOUR), dateFin: new Date(Date.now() - JOUR) })
      .where(eq(defi.id, defiId));
    expect((await participer(awa, premiere).expect(409)).body.detail).toMatch(/fermées/);
    await request(serveur())
      .put(`/api/v1/defis/${defiId}/participation`)
      .set('Origin', ORIGINE_SITE)
      .send({ creationId: premiere })
      .expect(401);
  });

  it('garde le défi choisi dans l’éditeur et y inscrit le brouillon à sa publication (F-64, RG-74)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const brouillon = (await awa.post('/api/v1/creations').send(unPrompt({ defiId })).expect(201))
      .body as CreationFicheApi;
    expect(brouillon.defi).toMatchObject({ id: defiId, etat: 'EN_COURS', ouvert: true });
    // Un brouillon rattaché n'est pas une participation : la page ne le montre pas.
    expect((await lire(awa)).participations).toEqual([]);

    // Ni la page des défis ni un autre membre n'en sont empêchés.
    const publiee = await creerCreation(contexte, awaId);
    await participer(awa, publiee).expect(204);
    const lea = await agentConnecte('lea@example.com');
    await participer(lea, await creerCreation(contexte, leaId)).expect(204);

    // Une création par personne : la publication est refusée, l'erreur sous le champ du défi.
    const refus = await publier(awa, brouillon.id).expect(400);
    expect(refus.body.erreurs).toEqual({
      defiId:
        'Vous participez déjà à ce défi avec « Cité imaginaire entre ciel et mer » : une création par personne.',
    });
    await awa.delete(`/api/v1/defis/${defiId}/participation`).expect(204);
    const fiche = (await publier(awa, brouillon.id).expect(200)).body as CreationFicheApi;
    expect(fiche.defi?.id).toBe(defiId);
    const d = await lire(awa);
    expect(d.moi?.participation).toEqual({
      id: brouillon.id,
      titre: 'Affiche typographique de Gorée',
    });
    expect(d.participations.map((p) => p.creation.id)).toContain(brouillon.id);
  });

  it('refuse la publication pour un défi terminé ; une création publiée participe ou se retire depuis l’éditeur', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    expect(
      (
        await awa
          .post('/api/v1/creations')
          .send(unPrompt({ defiId: defiId + 1000 }))
          .expect(400)
      ).body.erreurs,
    ).toEqual({ defiId: 'Ce défi est introuvable.' });

    const { id } = (await awa.post('/api/v1/creations').send(unPrompt({ defiId })).expect(201))
      .body as CreationFicheApi;
    await periode(-10, -1);
    expect((await publier(awa, id).expect(400)).body.erreurs).toEqual({
      defiId: 'Les participations à ce défi sont fermées.',
    });
    await awa
      .put(`/api/v1/creations/${id}`)
      .send(unPrompt({ defiId: null }))
      .expect(200);
    expect(((await publier(awa, id).expect(200)).body as CreationFicheApi).defi).toBeNull();

    // Publiée pendant le défi en cours : elle y participe, puis s'en retire, aux modifications.
    await periode(-2, 3);
    const modifier = (valeurs: Partial<ContenuCreationSaisi>) =>
      awa.put(`/api/v1/creations/${id}`).send(unPrompt({ ...valeurs, confirmationDonnees: true }));
    expect(((await modifier({ defiId }).expect(200)).body as CreationFicheApi).defi?.id).toBe(
      defiId,
    );
    expect((await lire(awa)).moi?.participation?.id).toBe(id);
    expect(
      ((await modifier({ defiId: null }).expect(200)).body as CreationFicheApi).defi,
    ).toBeNull();
    await modifier({ defiId }).expect(200);

    // Défi terminé : la participation est conservée ; sans défi dans l'envoi, rien ne change.
    await periode(-10, -1);
    expect((await modifier({ defiId: null }).expect(400)).body.erreurs).toEqual({
      defiId: 'Le défi n’est plus en cours : la participation est conservée.',
    });
    expect(((await modifier({}).expect(200)).body as CreationFicheApi).defi).toMatchObject({
      id: defiId,
      etat: 'TERMINE',
      ouvert: false,
    });
  });
});
