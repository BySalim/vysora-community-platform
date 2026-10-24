import type { ReproductionDeclareeApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { creation, mouvementReputation, outil } from '../src/db/schema/index.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Reproductions (INT-02, F-32, RG-42)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let auteurId: number;
  let lecteurId: number;
  let outilId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email = 'awa.sarr@example.com') {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }

  const declarer = (agent: ReturnType<typeof request.agent>, creationId: number, saisie: object) =>
    agent
      .post(`/api/v1/creations/${creationId}/reproductions`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ outilId, ...saisie });

  const mouvements = async () =>
    (
      await contexte.db
        .select({
          beneficiaire: mouvementReputation.beneficiaireId,
          motif: mouvementReputation.motif,
          points: mouvementReputation.points,
        })
        .from(mouvementReputation)
        .orderBy(mouvementReputation.id)
    ).map((m) => [m.beneficiaire === auteurId ? 'auteur' : 'lecteur', m.motif, m.points]);

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [chatgpt] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.nom, 'ChatGPT'));
    outilId = chatgpt?.id ?? 0;
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    lecteurId = (await creerMembre(contexte)).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  it('enregistre l’essai, met à jour la preuve et crédite les points une fois (RG-43, RG-80)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const agent = await agentConnecte();

    const premier = (
      await declarer(agent, id, { resultat: 'SUCCES', modeleNonReference: 'Modèle maison' }).expect(
        201,
      )
    ).body as ReproductionDeclareeApi;
    expect(premier).toMatchObject({
      reproduction: {
        resultat: 'SUCCES',
        modele: 'Modèle maison',
        retour: null,
        outil: { nom: 'ChatGPT' },
        auteur: { id: lecteurId },
      },
      total: 1,
      reussies: 1,
      tauxSucces: null,
    });
    await declarer(agent, id, { resultat: 'SUCCES' }).expect(201);
    const troisieme = (
      await declarer(agent, id, {
        resultat: 'ECHEC',
        retour: 'Avec un autre modèle, les tours disparaissent.',
      }).expect(201)
    ).body as ReproductionDeclareeApi;
    expect([troisieme.total, troisieme.reussies, troisieme.tauxSucces]).toEqual([3, 2, 67]);

    // RG-42 : plusieurs essais permis, points une seule fois par membre et par création.
    expect(await mouvements()).toEqual([
      ['lecteur', 'REPRODUCTION_DECLAREE', 2],
      ['auteur', 'REPRODUCTION_REUSSIE_RECUE', 5],
    ]);
  });

  it('exige un retour de 20 caractères pour un résultat partiel ou un échec', async () => {
    const id = await creerCreation(contexte, auteurId);
    const agent = await agentConnecte();
    const reponse = await declarer(agent, id, { resultat: 'PARTIEL', retour: 'Bof.' }).expect(400);
    expect(reponse.body.erreurs).toEqual({
      retour: 'Décrivez ce que vous avez obtenu : 20 caractères au moins.',
    });
    expect((await declarer(agent, id, { resultat: 'AUTRE' }).expect(400)).body.erreurs).toEqual({
      resultat: 'Indiquez votre résultat.',
    });
    expect(
      (await declarer(agent, id, { outilId: 999_999, resultat: 'SUCCES' }).expect(400)).body
        .erreurs,
    ).toEqual({ outilId: 'Choisissez un outil de la liste.' });
  });

  it('refuse l’auteur, un projet, un brouillon et un visiteur', async () => {
    const id = await creerCreation(contexte, auteurId);
    const projet = await creerCreation(contexte, auteurId);
    await contexte.db
      .update(creation)
      .set({ typeCreation: 'PROJET' })
      .where(eq(creation.id, projet));
    const brouillon = await creerCreation(contexte, auteurId, { publiee: false });

    const lea = await agentConnecte('lea@example.com');
    expect((await declarer(lea, id, { resultat: 'SUCCES' }).expect(403)).body.detail).toBe(
      'Les reproductions viennent des autres membres.',
    );
    const awa = await agentConnecte();
    await declarer(awa, projet, { resultat: 'SUCCES' }).expect(409);
    await declarer(awa, brouillon, { resultat: 'SUCCES' }).expect(404);
    await declarer(request.agent(serveur()), id, { resultat: 'SUCCES' }).expect(401);
    expect(await mouvements()).toEqual([]);
  });
});
