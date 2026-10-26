import type {
  LectureNotificationsApi,
  NotificationApi,
  NotificationsApi,
  SessionApi,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { contenu, message, mouvementReputation, outil, sujet } from '../src/db/schema/index.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
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

describe('Notifications (NOTIF-01, F-81, RG-91)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let auteurId: number;
  let awaId: number;
  const serveur = () => contexte.app.getHttpServer();
  type Agent = ReturnType<typeof request.agent>;

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }

  const envoyer = (requete: request.Test) =>
    requete.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);

  const commenter = (agent: Agent, creationId: number, corps: string, parentId?: number) =>
    envoyer(agent.post(`/api/v1/creations/${creationId}/commentaires`))
      .send({ corps, parentId })
      .expect(201)
      .then((r) => r.body as { id: number });

  const lister = async (agent: Agent, avant?: string) =>
    (
      await agent
        .get(`/api/v1/notifications${avant ? `?avant=${avant}` : ''}`)
        .set('X-Forwarded-For', ip)
        .expect(200)
    ).body as NotificationsApi;

  const nonLuesDeLaSession = async (agent: Agent) =>
    ((await agent.get('/api/v1/session').set('X-Forwarded-For', ip).expect(200)).body as SessionApi)
      .nonLues;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    awaId = (await creerMembre(contexte)).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  it('notifie l’auteur d’une création commentée, jamais celui qui commente sa propre création', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');

    await commenter(awa, creationId, 'Vous avez imposé la police du titre dès le premier prompt ?');
    await commenter(lea, creationId, 'Je précise la police dans le premier prompt.');

    const page = await lister(lea);
    expect(page.nonLues).toBe(1);
    expect(await nonLuesDeLaSession(lea)).toBe(1);
    expect(page.elements).toHaveLength(1);
    const [recue] = page.elements as [NotificationApi];
    expect(recue).toMatchObject({
      type: 'COMMENTAIRE_RECU',
      lue: false,
      disponible: true,
      par: { pseudo: 'awa-sarr' },
      texte: 'Vous avez imposé la police du titre dès le premier prompt ?',
      cible: {
        nature: 'CREATION',
        id: creationId,
        aMoi: true,
        titre: 'Cité imaginaire entre ciel et mer',
      },
      repondreA: { creationId },
      // Le commentaire de l'autrice n'est pas une réponse dans ce fil.
      reponse: null,
    });
    expect((await lister(awa)).elements).toHaveLength(0);
  });

  it('notifie la réponse à un commentaire, une seule fois quand l’auteur de la création répond à son tour', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');
    await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const kofi = await agentConnecte('kofi@example.com');

    const question = await commenter(awa, creationId, 'Le créneau est-il vérifié par le serveur ?');
    await commenter(lea, creationId, 'Oui, au moment de confirmer.', question.id);
    // Kofi répond à Léa dans le fil : Léa (son commentaire, sa création) n'a qu'une notification.
    await commenter(kofi, creationId, 'Même constat chez moi.', question.id);

    const deLea = (await lister(lea)).elements;
    expect(deLea.map((n) => n.type)).toEqual(['COMMENTAIRE_RECU', 'COMMENTAIRE_RECU']);
    const deAwa = (await lister(awa)).elements;
    expect(deAwa.map((n) => [n.type, n.par?.pseudo])).toEqual([
      ['REPONSE_COMMENTAIRE', 'kofi-mensah'],
      ['REPONSE_COMMENTAIRE', 'lea-martin'],
    ]);
    expect(deAwa[1]).toMatchObject({
      texte: 'Oui, au moment de confirmer.',
      origine: { moi: true, texte: 'Le créneau est-il vérifié par le serveur ?' },
      cible: { aMoi: false },
    });
    // Le fil de Léa montre sa réponse sous le commentaire d'Awa.
    const commentaireDAwa = deLea.find((n) => n.par?.pseudo === 'awa-sarr');
    expect(commentaireDAwa?.reponse).toMatchObject({
      moi: true,
      texte: 'Oui, au moment de confirmer.',
    });
  });

  it('retire la notification d’un commentaire supprimé et celles d’une création supprimée', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');
    const premier = await commenter(awa, creationId, 'Un premier commentaire.');
    await commenter(awa, creationId, 'Un second commentaire.');
    await envoyer(awa.delete(`/api/v1/commentaires/${premier.id}`)).expect(204);
    expect((await lister(lea)).elements.map((n) => n.texte)).toEqual(['Un second commentaire.']);

    await envoyer(awa.put(`/api/v1/contenus/${creationId}/votes/UTILE`)).expect(200);
    await envoyer(lea.delete(`/api/v1/creations/${creationId}`)).expect(204);
    const page = await lister(lea);
    expect(page.elements).toHaveLength(0);
    expect(page.nonLues).toBe(0);
  });

  it('notifie un essai avec son résultat et les points d’un essai réussi', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const [chatgpt] = await contexte.db.select({ id: outil.id }).from(outil).limit(1);
    const awa = await agentConnecte('awa.sarr@example.com');
    await envoyer(awa.post(`/api/v1/creations/${creationId}/reproductions`))
      .send({
        outilId: chatgpt?.id,
        resultat: 'SUCCES',
        retour: 'Même rendu pour Ségou, en trois échanges.',
      })
      .expect(201);
    const lea = await agentConnecte('lea@example.com');
    const [essai] = (await lister(lea)).elements;
    expect(essai).toMatchObject({
      type: 'REPRODUCTION_RECUE',
      points: 5,
      texte: 'Même rendu pour Ségou, en trois échanges.',
      reproduction: { resultat: 'SUCCES', outil: { id: chatgpt?.id } },
    });
  });

  it('regroupe les votes « Utile » d’un même jour et les recompte quand un vote est retiré', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const awa = await agentConnecte('awa.sarr@example.com');
    const kofi = await agentConnecte('kofi@example.com');
    const lea = await agentConnecte('lea@example.com');
    const voter = (agent: Agent) =>
      envoyer(agent.put(`/api/v1/contenus/${creationId}/votes/UTILE`)).expect(200);
    const retirer = (agent: Agent) =>
      envoyer(agent.delete(`/api/v1/contenus/${creationId}/votes/UTILE`)).expect(200);

    await voter(awa);
    const [premier] = (await lister(lea)).elements;
    await envoyer(lea.patch('/api/v1/notifications'))
      .send({ ids: [premier?.id], lue: true })
      .expect(200);
    await voter(kofi);
    let page = await lister(lea);
    expect(page.elements).toHaveLength(1);
    // Un nouveau vote rend la notification du jour non lue.
    expect(page.elements[0]).toMatchObject({
      type: 'VOTES_UTILE_RECUS',
      lue: false,
      nombre: 2,
      points: 20,
      par: { pseudo: 'kofi-mensah' },
    });
    expect(page.elements[0]?.votants.map((m) => m.pseudo)).toEqual(['kofi-mensah', 'awa-sarr']);

    await retirer(kofi);
    page = await lister(lea);
    expect(page.elements[0]).toMatchObject({ nombre: 1, points: 10 });
    expect(page.elements[0]?.votants.map((m) => m.pseudo)).toEqual(['awa-sarr']);
    await retirer(awa);
    expect((await lister(lea)).elements).toHaveLength(0);
  });

  it('notifie le niveau atteint une seule fois par niveau (F-71)', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    await contexte.db.insert(mouvementReputation).values({
      beneficiaireId: auteurId,
      motif: 'VOTE_UTILE_RECU',
      points: 45,
    });
    const awa = await agentConnecte('awa.sarr@example.com');
    const vote = `/api/v1/contenus/${creationId}/votes/UTILE`;
    await envoyer(awa.put(vote)).expect(200);
    await envoyer(awa.delete(vote)).expect(200);
    await envoyer(awa.put(vote)).expect(200);

    const lea = await agentConnecte('lea@example.com');
    const niveaux = (await lister(lea)).elements.filter((n) => n.type === 'NIVEAU_ATTEINT');
    expect(niveaux).toHaveLength(1);
    expect(niveaux[0]?.niveau).toMatchObject({
      code: 'apprenti',
      libelle: 'Apprenti',
      seuilPoints: 50,
    });
  });

  it('marque lu, non lu, tout lu, et l’annule ; jamais les notifications d’un autre membre', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    await commenter(awa, creationId, 'Premier.');
    await commenter(awa, creationId, 'Second.');
    const lea = await agentConnecte('lea@example.com');
    const [second, premier] = (await lister(lea)).elements as [NotificationApi, NotificationApi];

    // Awa ne peut pas lire les notifications de Léa.
    expect(
      (
        await envoyer(awa.patch('/api/v1/notifications'))
          .send({ ids: [premier.id], lue: true })
          .expect(200)
      ).body,
    ).toEqual({ nonLues: 0, ids: [] });

    let lecture = (
      await envoyer(lea.patch('/api/v1/notifications')).send({ ids: [premier.id], lue: true })
    ).body as LectureNotificationsApi;
    expect(lecture).toEqual({ nonLues: 1, ids: [premier.id] });

    lecture = (await envoyer(lea.post('/api/v1/notifications/lecture')).expect(200))
      .body as LectureNotificationsApi;
    expect(lecture).toEqual({ nonLues: 0, ids: [second.id] });
    expect(await nonLuesDeLaSession(lea)).toBe(0);

    lecture = (
      await envoyer(lea.patch('/api/v1/notifications')).send({ ids: lecture.ids, lue: false })
    ).body as LectureNotificationsApi;
    expect(lecture.nonLues).toBe(1);
    await envoyer(lea.patch('/api/v1/notifications')).send({ ids: [], lue: true }).expect(400);
  });

  it('réserve les notifications au membre connecté, même en lecture seule', async () => {
    await request(serveur()).get('/api/v1/notifications').expect(401);
    await creerMembre(contexte, {
      pseudo: 'moussa-diallo',
      email: 'moussa@example.com',
      emailVerifie: false,
    });
    const moussa = await agentConnecte('moussa@example.com');
    const page = await lister(moussa);
    expect(page).toMatchObject({ elements: [], suivant: null, nonLues: 0, email: true });

    await envoyer(moussa.put('/api/v1/moi/preferences-notifications'))
      .send({ email: false })
      .expect(200, { email: false });
    expect((await lister(moussa)).email).toBe(false);
  });

  it('ne montre plus le texte d’un commentaire masqué par la modération', async () => {
    const creationId = await creerCreation(contexte, auteurId);
    const awa = await agentConnecte('awa.sarr@example.com');
    const commentaire = await commenter(awa, creationId, 'Un texte qui sera masqué.');
    await contexte.db
      .update(contenu)
      .set({ statut: 'MASQUE' })
      .where(eq(contenu.id, commentaire.id));
    const lea = await agentConnecte('lea@example.com');
    const [masquee] = (await lister(lea)).elements;
    expect(masquee).toMatchObject({
      type: 'COMMENTAIRE_RECU',
      disponible: false,
      texte: null,
      cible: null,
      repondreA: null,
      par: { pseudo: 'awa-sarr' },
    });
  });

  it('pagine par 50, de la plus récente à la plus ancienne', async () => {
    const service = contexte.app.get(NotificationsService);
    const debut = Date.UTC(2026, 9, 1);
    for (let i = 0; i < 53; i++)
      await service.notifier(contexte.db, {
        type: 'BADGE_OBTENU',
        destinataireId: auteurId,
        donnees: { badge: 'PREMIERE_CREATION' },
        date: new Date(debut + i * 60_000),
      });
    const lea = await agentConnecte('lea@example.com');
    const premiere = await lister(lea);
    expect(premiere.elements).toHaveLength(50);
    expect(premiere.nonLues).toBe(53);
    expect(premiere.suivant).not.toBeNull();
    const seconde = await lister(lea, premiere.suivant ?? undefined);
    expect(seconde.elements).toHaveLength(3);
    expect(seconde.suivant).toBeNull();
    expect(new Date(seconde.elements[2]?.date ?? 0).getTime()).toBe(debut);
  });

  it('envoie par e-mail les réponses à un sujet selon la préférence (F-81), après la notification', async () => {
    const service = contexte.app.get(NotificationsService);
    const [ligneSujet] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId })
      .returning({ id: contenu.id });
    if (!ligneSujet) throw new Error('Sujet non créé');
    await contexte.db.insert(sujet).values({
      id: ligneSujet.id,
      typeSujet: 'QUESTION',
      titre: 'Comment vérifier qu’un script ne supprime rien ?',
      slug: 'comment-verifier-qu-un-script-ne-supprime-rien',
      corps: 'Je veux être sûre qu’aucun fichier ne disparaît pendant le tri.',
    });
    const repondre = async () => {
      const [ligne] = await contexte.db
        .insert(contenu)
        .values({ typeContenu: 'MESSAGE', auteurId: awaId })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Réponse non créée');
      await contexte.db.insert(message).values({
        id: ligne.id,
        sujetId: ligneSujet.id,
        corps: 'Demandez une exécution à blanc avant de lancer pour de vrai.',
      });
      return service.notifier(contexte.db, {
        type: 'REPONSE_SUJET',
        destinataireId: auteurId,
        declencheurId: awaId,
        contenuId: ligne.id,
      });
    };

    await service.envoyerEmails([await repondre()]);
    expect(contexte.emails).toHaveLength(1);
    expect(contexte.emails[0]).toMatchObject({
      a: 'lea@example.com',
      sujet: 'awa-sarr a répondu à votre question',
    });
    expect(contexte.emails[0]?.texte).toContain('/notifications?notification=');

    const lea = await agentConnecte('lea@example.com');
    await envoyer(lea.put('/api/v1/moi/preferences-notifications')).send({ email: false });
    await service.envoyerEmails([await repondre()]);
    expect(contexte.emails).toHaveLength(1);
    // Un commentaire reçu ne part jamais par e-mail.
    expect((await lister(lea)).elements.map((n) => n.type)).toEqual([
      'REPONSE_SUJET',
      'REPONSE_SUJET',
    ]);
  });
});
