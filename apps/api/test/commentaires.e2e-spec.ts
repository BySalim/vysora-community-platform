import type { CommentaireApi, CreationFicheApi } from '@vysora/shared';
import request from 'supertest';
import { contenu } from '../src/db/schema/index.js';
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

describe('Commentaires (INT-03, F-40, F-42)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let auteurId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string) {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }

  const commenter = (
    agent: ReturnType<typeof request.agent>,
    creationId: number,
    corps: unknown,
    parentId?: number,
  ) =>
    agent
      .post(`/api/v1/creations/${creationId}/commentaires`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ corps, parentId });

  const fiche = async (creationId: number) =>
    (await request(serveur()).get(`/api/v1/creations/${creationId}`).expect(200))
      .body as CreationFicheApi;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    await creerMembre(contexte);
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
    await contexte.app.close();
  });

  it('publie un commentaire et rattache une réponse au commentaire d’origine (F-42)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');

    const premier = (
      await commenter(awa, id, '  La précision sur les **tours** change tout.  ').expect(201)
    ).body as CommentaireApi;
    expect(premier).toMatchObject({
      parentId: null,
      corps: 'La précision sur les **tours** change tout.',
      auteur: { pseudo: 'awa-sarr' },
      supprime: false,
    });
    const reponse = (
      await commenter(lea, id, 'Merci, c’est le détail décisif.', premier.id).expect(201)
    ).body as CommentaireApi;
    const reponseALaReponse = (await commenter(awa, id, 'Bon à savoir !', reponse.id).expect(201))
      .body as CommentaireApi;
    expect([reponse.parentId, reponseALaReponse.parentId]).toEqual([premier.id, premier.id]);

    const { commentaires } = await fiche(id);
    expect(commentaires.total).toBe(3);
    expect(commentaires.elements.map((c) => c.id)).toEqual([
      premier.id,
      reponse.id,
      reponseALaReponse.id,
    ]);
  });

  it('refuse un commentaire vide, trop long, sur un brouillon ou sans compte (RG-50)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const brouillon = await creerCreation(contexte, auteurId, { publiee: false });
    const awa = await agentConnecte('awa.sarr@example.com');

    expect((await commenter(awa, id, '   ').expect(400)).body.erreurs).toEqual({
      corps: 'Écrivez votre commentaire.',
    });
    expect((await commenter(awa, id, 'a'.repeat(5001)).expect(400)).body.erreurs).toEqual({
      corps: 'Votre commentaire compte 5 000 caractères au plus.',
    });
    await commenter(awa, brouillon, 'Un commentaire sur un brouillon.').expect(404);
    await commenter(request.agent(serveur()), id, 'Sans compte.').expect(401);
    expect(await contexte.db.$count(contenu)).toBe(2);
  });

  it('limite les commentaires d’un membre Curieux à 20 par 24 heures (RG-85)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const membre = (await awa.get('/api/v1/session').expect(200)).body.membre as { id: number };
    await contexte.db.insert(contenu).values(
      Array.from({ length: 20 }, (_, i) => ({
        typeContenu: 'MESSAGE' as const,
        auteurId: membre.id,
        dateCreation: new Date(Date.now() - (i + 1) * 60_000),
      })),
    );
    const refus = await commenter(awa, id, 'Un commentaire de trop.').expect(429);
    expect(refus.body.code).toBe('LIMITE_ATTEINTE');
  });

  it('laisse l’auteur modifier et supprimer son commentaire, pas les autres (F-40, RG-51)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');
    const avecReponse = (await commenter(awa, id, 'Question sur le prompt.').expect(201))
      .body as CommentaireApi;
    await commenter(lea, id, 'Réponse de l’autrice.', avecReponse.id).expect(201);
    const seul = (await commenter(awa, id, 'Un commentaire isolé.').expect(201))
      .body as CommentaireApi;

    await lea
      .patch(`/api/v1/commentaires/${seul.id}`)
      .set('Origin', ORIGINE_SITE)
      .send({ corps: 'Modifié par une autre.' })
      .expect(403);
    const modifie = await awa
      .patch(`/api/v1/commentaires/${seul.id}`)
      .set('Origin', ORIGINE_SITE)
      .send({ corps: 'Un commentaire précisé.' })
      .expect(200);
    expect(modifie.body.corps).toBe('Un commentaire précisé.');
    expect(modifie.body.dateModification).not.toBeNull();

    await lea.delete(`/api/v1/commentaires/${seul.id}`).set('Origin', ORIGINE_SITE).expect(403);
    for (const c of [avecReponse, seul])
      await awa.delete(`/api/v1/commentaires/${c.id}`).set('Origin', ORIGINE_SITE).expect(204);
    await awa.delete(`/api/v1/commentaires/${seul.id}`).set('Origin', ORIGINE_SITE).expect(404);

    const { commentaires } = await fiche(id);
    expect(commentaires.total).toBe(1);
    expect(commentaires.elements.map((c) => [c.supprime, c.corps])).toEqual([
      [true, null],
      [false, 'Réponse de l’autrice.'],
    ]);
  });
});
