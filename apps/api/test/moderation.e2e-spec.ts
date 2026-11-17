import type {
  CreationFicheApi,
  DecisionApi,
  DossierModerationApi,
  FileModerationApi,
  MesCreationsApi,
  NotificationsApi,
  SessionApi,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  commentaire,
  contenu,
  creation,
  decisionModeration,
  defi,
  mouvementReputation,
  notification,
  outil,
  signalement,
  utilisateur,
} from '../src/db/schema/index.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerCreation,
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = ReturnType<typeof request.agent>;

describe('Signalements et décisions (MOD-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let auteurId: number;
  let awaId: number;
  let moderateurId: number;

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, email);
    return agent;
  }
  const awa = () => agentConnecte('awa.sarr@example.com');
  const lea = () => agentConnecte('lea@example.com');
  const thomas = () => agentConnecte('thomas@example.com');

  const signaler = (agent: Agent, id: number, corps: object = { motif: 'SPAM' }) =>
    agent
      .post(`/api/v1/contenus/${id}/signalements`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send(corps);
  const decider = (agent: Agent, id: number, corps: object) =>
    agent
      .post(`/api/v1/moderation/contenus/${id}/decisions`)
      .set('Origin', ORIGINE_SITE)
      .send(corps);

  /** Points de réputation d'un membre (somme des mouvements). */
  const reputation = async (membreId: number) =>
    (
      await contexte.db
        .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, membreId))
    )[0]?.points;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    awaId = (await creerMembre(contexte)).id;
    moderateurId = (
      await creerMembre(contexte, {
        pseudo: 'thomas-diallo',
        email: 'thomas@example.com',
        role: 'MODERATEUR',
      })
    ).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('signaler un contenu (F-90)', () => {
    it('enregistre un signalement ouvert, un seul par membre et par contenu (RG-100, CI-21)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agent = await awa();

      const reponse = await signaler(agent, id, {
        motif: 'DONNEES_PERSONNELLES',
        precision: '  Une capture laisse lire un numéro de téléphone.  ',
      }).expect(201);
      expect(reponse.body.id).toEqual(expect.any(Number));
      const [ligne] = await contexte.db.select().from(signalement);
      expect(ligne).toMatchObject({
        signaleurId: awaId,
        contenuId: id,
        motif: 'DONNEES_PERSONNELLES',
        precision: 'Une capture laisse lire un numéro de téléphone.',
        statut: 'OUVERT',
        decisionId: null,
      });

      const fiche = (await agent.get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(fiche.moi?.signalementOuvert).toBe(true);

      const second = await signaler(agent, id, { motif: 'SPAM' }).expect(409);
      expect(second.body.detail).toBe(
        'Vous avez déjà signalé ce contenu. La modération l’examine.',
      );
      expect(await contexte.db.$count(signalement)).toBe(1);
    });

    it('exige une précision pour « Autre » et refuse un motif inconnu (RG-100)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agent = await awa();
      const autre = await signaler(agent, id, { motif: 'AUTRE', precision: '   ' }).expect(400);
      expect(autre.body.erreurs).toEqual({ precision: 'Précisez le motif du signalement.' });
      const inconnu = await signaler(agent, id, { motif: 'OBSOLETE' }).expect(400);
      expect(inconnu.body.erreurs.motif).toBe('Choisissez le motif du signalement.');
      const long = await signaler(agent, id, { motif: 'SPAM', precision: 'x'.repeat(1001) });
      expect(long.status).toBe(400);
      await signaler(agent, id, {
        motif: 'AUTRE',
        precision: 'Le prompt recopie un livre.',
      }).expect(201);
    });

    it('refuse de signaler son propre contenu, un contenu invisible ou sans compte actif', async () => {
      const sienne = await creerCreation(contexte, awaId);
      const brouillon = await creerCreation(contexte, auteurId, { publiee: false });
      const masquee = await creerCreation(contexte, auteurId, { statut: 'MASQUE' });
      const agent = await awa();

      const propre = await signaler(agent, sienne).expect(403);
      expect(propre.body.detail).toBe('Vous ne pouvez pas signaler votre propre contenu.');
      await signaler(agent, brouillon).expect(404);
      await signaler(agent, masquee).expect(404);
      await signaler(agent, 999_999).expect(404);

      const visiteur = await request(serveur())
        .post(`/api/v1/contenus/${sienne}/signalements`)
        .set('Origin', ORIGINE_SITE)
        .send({ motif: 'SPAM' })
        .expect(401);
      expect(visiteur.body.raison).toBe('connexion');

      await creerMembre(contexte, {
        pseudo: 'non-verifie',
        email: 'non.verifie@example.com',
        emailVerifie: false,
      });
      const lectureSeule = await signaler(
        await agentConnecte('non.verifie@example.com'),
        brouillon,
      ).expect(403);
      expect(lectureSeule.body.raison).toBe('email');
    });
  });

  describe('file de la modération (F-91)', () => {
    it('est réservée à la modération', async () => {
      const membre = await (await awa()).get('/api/v1/moderation/file').expect(403);
      expect(membre.body.raison).toBe('role');
      await request(serveur()).get('/api/v1/moderation/file').expect(401);
      const id = await creerCreation(contexte, auteurId);
      await (await awa()).get(`/api/v1/moderation/contenus/${id}`).expect(403);
      await decider(await awa(), id, { action: 'MASQUER', motif: 'Spam.' }).expect(403);
    });

    it('range les contenus du plus ancien au plus récent, avec le nombre et les motifs (RG-105)', async () => {
      const recente = await creerCreation(contexte, auteurId);
      const ancienne = await creerCreation(contexte, auteurId);
      const sienne = await creerCreation(contexte, moderateurId);
      const commentaireId = await commenter(ancienne, awaId);
      const autreId = (
        await creerMembre(contexte, { pseudo: 'ibrahima-sow', email: 'ibrahima@example.com' })
      ).id;
      const ilYA = (heures: number) => new Date(Date.now() - heures * 3_600_000);
      await contexte.db.insert(signalement).values([
        { signaleurId: awaId, contenuId: recente, motif: 'SPAM', date: ilYA(2) },
        { signaleurId: awaId, contenuId: ancienne, motif: 'PLAGIAT', date: ilYA(80) },
        { signaleurId: autreId, contenuId: ancienne, motif: 'PLAGIAT', date: ilYA(10) },
        { signaleurId: moderateurId, contenuId: ancienne, motif: 'SPAM', date: ilYA(5) },
        { signaleurId: awaId, contenuId: sienne, motif: 'SPAM', date: ilYA(100) },
        { signaleurId: awaId, contenuId: commentaireId, motif: 'HARCELEMENT', date: ilYA(1) },
      ]);

      const file = (await (await thomas()).get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      // RG-104 : la création du modérateur n'est pas dans sa file.
      expect(file.elements.map((e) => e.contenu.id)).toEqual([ancienne, recente, commentaireId]);
      const [premier] = file.elements;
      expect(premier).toMatchObject({
        enRetard: true,
        nouvelExamen: false,
        signalements: {
          nombre: 3,
          motifs: [
            { motif: 'PLAGIAT', nombre: 2 },
            { motif: 'SPAM', nombre: 1 },
          ],
        },
        historiqueAuteur: { decisions: 0, derniere: null },
        contenu: {
          type: 'CREATION',
          statut: 'VISIBLE',
          intitule: 'Cité imaginaire entre ciel et mer',
          page: { genre: 'CREATION', id: ancienne, ancre: null },
          auteur: { pseudo: 'lea-martin' },
        },
      });
      expect(file.elements[1]?.enRetard).toBe(false);
      expect([file.total, file.enRetard]).toEqual([3, 1]);
      expect(file.elements[2]?.contenu).toMatchObject({
        type: 'COMMENTAIRE',
        intitule: 'Le prompt ne donne pas le format attendu.',
        page: { genre: 'CREATION', id: ancienne, ancre: `commentaire-${commentaireId}` },
        auteur: { pseudo: 'awa-sarr' },
      });
      expect(file.suivant).toBeNull();
    });

    it('se lit par pages de 20', async () => {
      const ids: number[] = [];
      for (let i = 0; i < 21; i++) ids.push(await creerCreation(contexte, auteurId));
      await contexte.db.insert(signalement).values(
        ids.map((id, i) => ({
          signaleurId: awaId,
          contenuId: id,
          motif: 'SPAM' as const,
          date: new Date(Date.now() - (30 - i) * 60_000),
        })),
      );
      const agent = await thomas();
      const premiere = (await agent.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(premiere.elements).toHaveLength(20);
      expect(premiere.suivant).toEqual(expect.any(String));
      const seconde = (
        await agent.get('/api/v1/moderation/file').query({ apres: premiere.suivant }).expect(200)
      ).body as FileModerationApi;
      expect(seconde.elements.map((e) => e.contenu.id)).toEqual([ids[20]]);
      expect(seconde.suivant).toBeNull();
      // Les totaux valent pour toute la file, quelle que soit la page.
      expect([premiere.total, seconde.total, seconde.enRetard]).toEqual([21, 21, 0]);
      await agent.get('/api/v1/moderation/file').query({ apres: 'nimporte' }).expect(400);
    });
  });

  describe('décisions (F-91, RG-102)', () => {
    it('masque un contenu : signalements fondés, points annulés, auteur informé, puis rétablit (RG-30, RG-82)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agentAwa = await awa();
      await agentAwa
        .put(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await reputation(auteurId)).toBe(10);
      await signaler(agentAwa, id, { motif: 'DONNEES_PERSONNELLES' }).expect(201);

      const moderation = await thomas();
      const reponse = await decider(moderation, id, {
        action: 'MASQUER',
        motif: 'Une capture d’écran laisse lire le numéro de téléphone d’une cliente.',
      }).expect(201);
      const decision = reponse.body as DecisionApi;
      expect(decision).toMatchObject({
        action: 'MASQUER',
        contenuId: id,
        membreVise: null,
        finSuspension: null,
        decideur: { pseudo: 'thomas-diallo' },
        signalementsClos: 1,
      });
      const [statut] = await contexte.db
        .select({ statut: contenu.statut })
        .from(contenu)
        .where(eq(contenu.id, id));
      expect(statut?.statut).toBe('MASQUE');
      const [clos] = await contexte.db.select().from(signalement);
      expect(clos).toMatchObject({ statut: 'FONDE', decisionId: decision.id });
      expect(await reputation(auteurId)).toBe(0);

      // F-92 : e-mail à l'auteur, avec le motif et la référence de la décision.
      expect(contexte.emails).toHaveLength(1);
      const [email] = contexte.emails;
      expect(email?.a).toBe('lea@example.com');
      expect(email?.sujet).toBe('Votre création a été masquée par la modération');
      expect(email?.texte).toContain('numéro de téléphone d’une cliente');
      expect(email?.texte).toContain(`Décision n° ${decision.id}`);
      expect(email?.texte).toContain(`/creations/${id}/modifier`);

      // RG-30 : l'auteur et la modération la voient, avec la date et le motif ; les autres, non.
      await agentAwa.get(`/api/v1/creations/${id}`).expect(404);
      const vueAuteur = (await (await lea()).get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(vueAuteur.masquage).toEqual({
        date: decision.date,
        motif: 'Une capture d’écran laisse lire le numéro de téléphone d’une cliente.',
        signalements: null,
        automatique: false,
      });
      const vueModeration = (await moderation.get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(vueModeration.masquage?.signalements).toBe(1);
      const mesCreations = (await (await lea()).get('/api/v1/moi/creations').expect(200))
        .body as MesCreationsApi;
      expect(mesCreations.elements[0]?.masquage).toEqual({
        date: decision.date,
        motif: 'Une capture d’écran laisse lire le numéro de téléphone d’une cliente.',
        signalements: null,
        automatique: false,
      });

      // Plus rien d'ouvert : la file est vide ; masquer de nouveau est refusé.
      let file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file.elements).toEqual([]);
      await decider(moderation, id, { action: 'MASQUER', motif: 'Encore.' }).expect(409);

      // L'auteur modifie sa création : nouvel examen demandé.
      await contexte.db
        .update(contenu)
        .set({ dateModification: new Date() })
        .where(eq(contenu.id, id));
      file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file.elements.map((e) => [e.contenu.id, e.nouvelExamen])).toEqual([[id, true]]);

      contexte.emails.length = 0;
      const retablie = await decider(moderation, id, {
        action: 'RETABLIR',
        motif: 'La capture a été remplacée.',
      }).expect(201);
      expect(retablie.body.signalementsClos).toBe(0);
      expect(await reputation(auteurId)).toBe(10);
      const mouvements = await contexte.db
        .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, auteurId))
        .orderBy(mouvementReputation.id);
      expect(mouvements.map((m) => [m.motif, m.points])).toEqual([
        ['VOTE_UTILE_RECU', 10],
        ['ANNULATION', -10],
        ['VOTE_UTILE_RECU', 10],
      ]);
      await agentAwa.get(`/api/v1/creations/${id}`).expect(200);
      expect(contexte.emails[0]?.sujet).toBe('Votre création est de nouveau visible');
      file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file.elements).toEqual([]);

      // Le vote reste retirable : les points regénérés s'annulent comme les premiers (RG-82).
      await agentAwa
        .delete(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await reputation(auteurId)).toBe(0);
      await decider(moderation, id, { action: 'RETABLIR', motif: 'Rien.' }).expect(409);
    });

    it('« aucune » clôt les signalements comme non fondés, sans e-mail ; une décision est immuable (RG-102)', async () => {
      const id = await creerCreation(contexte, auteurId);
      await signaler(await awa(), id, { motif: 'HORS_SUJET' }).expect(201);
      const reponse = await decider(await thomas(), id, {
        action: 'AUCUNE',
        motif: 'La création correspond à sa catégorie.',
      }).expect(201);
      const [clos] = await contexte.db.select().from(signalement);
      expect(clos?.statut).toBe('NON_FONDE');
      expect(contexte.emails).toEqual([]);
      // Une fois clos, un nouveau signalement du même membre redevient possible.
      await signaler(await awa(), id, { motif: 'SPAM' }).expect(201);

      await expect(
        contexte.db
          .update(decisionModeration)
          .set({ motif: 'Autre motif.' })
          .where(eq(decisionModeration.id, reponse.body.id)),
      ).rejects.toThrow();
      await expect(
        contexte.db.delete(decisionModeration).where(eq(decisionModeration.id, reponse.body.id)),
      ).rejects.toThrow();
    });

    it('exige un motif et refuse les actions des administrateurs (RG-102)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const moderation = await thomas();
      const sansMotif = await decider(moderation, id, { action: 'MASQUER', motif: ' ' }).expect(
        400,
      );
      expect(sansMotif.body.erreurs).toEqual({ motif: 'Rédigez le motif communiqué à l’auteur.' });
      await decider(moderation, id, { action: 'BANNIR', motif: 'Fraude.' }).expect(400);
      expect(await contexte.db.$count(decisionModeration)).toBe(0);
    });

    it('refuse de décider sur son propre contenu et d’en ouvrir le dossier (RG-104)', async () => {
      const id = await creerCreation(contexte, moderateurId);
      const moderation = await thomas();
      const refus = await decider(moderation, id, { action: 'AUCUNE', motif: 'Rien.' }).expect(403);
      expect(refus.body.detail).toBe(
        'Ce contenu est le vôtre : un autre membre de l’équipe de modération prendra la décision.',
      );
      await moderation.get(`/api/v1/moderation/contenus/${id}`).expect(403);
    });

    it('suspend l’auteur de 1 à 90 jours : il se connecte en lecture seule (RG-103, CI-19)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const autre = await creerCreation(contexte, awaId);
      const moderation = await thomas();
      const sansDuree = await decider(moderation, id, {
        action: 'SUSPENDRE',
        motif: 'Spam répété.',
      }).expect(400);
      expect(sansDuree.body.erreurs.dureeJours).toBe(
        'Indiquez la durée de la suspension : de 1 à 90 jours.',
      );
      await decider(moderation, id, { action: 'SUSPENDRE', motif: 'Spam.', dureeJours: 91 }).expect(
        400,
      );
      await decider(moderation, id, { action: 'SUSPENDRE', motif: 'Spam.', dureeJours: 0 }).expect(
        400,
      );
      await decider(moderation, id, { action: 'AVERTIR', motif: 'Spam.', dureeJours: 3 }).expect(
        400,
      );

      const reponse = await decider(moderation, id, {
        action: 'SUSPENDRE',
        motif: 'Le même lien vers votre site a été publié dans six commentaires.',
        dureeJours: 7,
      }).expect(201);
      const decision = reponse.body as DecisionApi;
      expect(decision.membreVise?.pseudo).toBe('lea-martin');
      expect(new Date(decision.finSuspension ?? '').getTime()).toBe(
        new Date(decision.date).getTime() + 7 * 86_400_000,
      );
      expect(contexte.emails[0]?.sujet).toMatch(/^Votre compte est suspendu jusqu’au /);
      expect(contexte.emails[0]?.texte).toContain('Fin de la suspension');

      const agentLea = await lea();
      const session = (await agentLea.get('/api/v1/session').expect(200)).body as SessionApi;
      expect(session.etat.compte).toBe('suspendu');
      expect(session.suspensionJusqua).toBe(decision.finSuspension);
      const vote = await agentLea
        .put(`/api/v1/contenus/${autre}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(403);
      expect(vote.body.raison).toBe('suspendu');
      // Le contenu reste visible : la suspension vise le membre.
      await (await awa()).get(`/api/v1/creations/${id}`).expect(200);
    });

    it('pose et retire l’avertissement « instructions pour agent » (RG-23)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const commentaireId = await commenter(id, awaId);
      const moderation = await thomas();
      await decider(moderation, id, {
        action: 'AJOUTER_AVERTISSEMENT_AGENT',
        motif: 'Le prompt demande de supprimer des fichiers.',
      }).expect(201);
      const lire = async () =>
        (
          await contexte.db
            .select({ a: creation.avertissementAgent })
            .from(creation)
            .where(eq(creation.id, id))
        )[0]?.a;
      expect(await lire()).toBe('MODERATION');
      await decider(moderation, id, {
        action: 'AJOUTER_AVERTISSEMENT_AGENT',
        motif: 'Encore.',
      }).expect(409);
      await decider(moderation, commentaireId, {
        action: 'AJOUTER_AVERTISSEMENT_AGENT',
        motif: 'Un commentaire.',
      }).expect(409);
      await decider(moderation, id, {
        action: 'RETIRER_AVERTISSEMENT_AGENT',
        motif: 'Le prompt a été corrigé.',
      }).expect(201);
      expect(await lire()).toBe('AUCUN');
      expect(contexte.emails.map((e) => e.sujet)).toEqual([
        'Un avertissement a été ajouté à votre création',
        'L’avertissement de votre création a été retiré',
      ]);
    });

    it('supprime un contenu : il ne figure plus nulle part (RG-19, RG-82)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agentAwa = await awa();
      await agentAwa
        .put(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await signaler(agentAwa, id, { motif: 'ILLICITE' }).expect(201);
      const moderation = await thomas();
      await decider(moderation, id, { action: 'SUPPRIMER', motif: 'Contenu illicite.' }).expect(
        201,
      );
      expect(await reputation(auteurId)).toBe(0);
      await (await lea()).get(`/api/v1/creations/${id}`).expect(404);
      const file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file).toEqual({ elements: [], suivant: null, total: 0, enRetard: 0 });
      await decider(moderation, id, { action: 'RETABLIR', motif: 'Erreur.' }).expect(404);
      // Le dossier reste lisible, sans plus aucune décision possible.
      const dossier = (await moderation.get(`/api/v1/moderation/contenus/${id}`).expect(200))
        .body as DossierModerationApi;
      expect([dossier.contenu.statut, dossier.actions]).toEqual(['SUPPRIME', []]);
      expect(contexte.emails[0]?.sujet).toBe('Votre création a été supprimée par la modération');
      expect(contexte.emails[0]?.texte).toContain('/contact?motif=contestation');
    });
  });

  describe('notifications de l’auteur (RG-91, RG-90)', () => {
    it('masque, rétablit, suspend puis supprime : chaque décision notifiée, un seul e-mail, sans nommer la modération', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agentAwa = await awa();
      const texte = 'Écrivez-moi au 06 12 34 56 78 pour la version complète.';
      const commentaireId = (
        await agentAwa
          .post(`/api/v1/creations/${id}/commentaires`)
          .set('Origin', ORIGINE_SITE)
          .send({ corps: texte })
          .expect(201)
      ).body.id as number;
      const moderation = await thomas();
      for (const corps of [
        { action: 'MASQUER', motif: 'Numéro de téléphone publié.' },
        { action: 'RETABLIR', motif: 'Le numéro a été retiré.' },
        { action: 'SUSPENDRE', motif: 'Démarchage répété.', dureeJours: 7 },
        { action: 'SUPPRIMER', motif: 'Démarchage.' },
      ])
        await decider(moderation, commentaireId, corps).expect(201);

      // Un e-mail par décision, celui de la modération (F-92) ; aucun e-mail de notification.
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['awa.sarr@example.com', 'Votre commentaire a été masqué par la modération'],
        ['awa.sarr@example.com', 'Votre commentaire est de nouveau visible'],
        ['awa.sarr@example.com', expect.stringMatching(/^Votre compte est suspendu jusqu’au /)],
        ['awa.sarr@example.com', 'Votre commentaire a été supprimé par la modération'],
      ]);
      const recues = (await (await awa()).get('/api/v1/notifications').expect(200))
        .body as NotificationsApi;
      const vise = { type: 'COMMENTAIRE', intitule: texte };
      const decision = (action: string, finSuspension: unknown = null) => ({
        action,
        finSuspension,
        contenu: vise,
        automatique: false,
      });
      // Le commentaire est supprimé : plus disponible, mais chaque décision se lit encore.
      expect(
        recues.elements.map((n) => [n.type, n.par, n.disponible, n.motif, n.decision]),
      ).toEqual([
        ['DECISION_MODERATION', null, false, 'Démarchage.', decision('SUPPRIMER')],
        [
          'DECISION_MODERATION',
          null,
          false,
          'Démarchage répété.',
          decision('SUSPENDRE', expect.any(String)),
        ],
        ['CONTENU_RETABLI', null, false, 'Le numéro a été retiré.', decision('RETABLIR')],
        ['CONTENU_MASQUE', null, false, 'Numéro de téléphone publié.', decision('MASQUER')],
      ]);
      // Le commentaire supprimé ne montre plus son texte ; la notification qu'il avait fait naître
      // disparaît, les décisions restent.
      expect(recues.elements.every((n) => n.texte === null && n.repondreA === null)).toBe(true);
      const deLea = await contexte.db
        .select({ type: notification.type })
        .from(notification)
        .where(eq(notification.destinataireId, auteurId));
      expect(deLea).toEqual([]);
    });

    it('n’écrit qu’à une adresse vérifiée ; la décision reste dans les notifications (RG-90)', async () => {
      const id = await creerCreation(contexte, auteurId);
      await contexte.db
        .update(utilisateur)
        .set({ emailVerifie: false })
        .where(eq(utilisateur.id, auteurId));
      await decider(await thomas(), id, { action: 'AVERTIR', motif: 'Sources non citées.' }).expect(
        201,
      );
      expect(contexte.emails).toEqual([]);
      const [recue] = await contexte.db
        .select({ type: notification.type, donnees: notification.donnees })
        .from(notification)
        .where(eq(notification.destinataireId, auteurId));
      expect(recue).toMatchObject({
        type: 'DECISION_MODERATION',
        donnees: { action: 'AVERTIR', motif: 'Sources non citées.', typeContenu: 'CREATION' },
      });
    });
  });

  it('présente le dossier d’un contenu : signalements, décisions, historique de l’auteur (F-91)', async () => {
    const premiere = await creerCreation(contexte, auteurId);
    const seconde = await creerCreation(contexte, auteurId);
    const moderation = await thomas();
    await decider(moderation, premiere, { action: 'AVERTIR', motif: 'Autopromotion.' }).expect(201);
    await signaler(await awa(), seconde, {
      motif: 'AUTRE',
      precision: 'Le prompt recopie un article.',
    }).expect(201);
    await decider(moderation, seconde, { action: 'AUCUNE', motif: 'Citation courte.' }).expect(201);
    await signaler(await awa(), seconde, { motif: 'PLAGIAT' }).expect(201);

    const file = (await moderation.get('/api/v1/moderation/file').expect(200))
      .body as FileModerationApi;
    expect(file.elements[0]?.historiqueAuteur).toMatchObject({
      decisions: 1,
      derniere: { action: 'AVERTIR' },
    });

    const dossier = (await moderation.get(`/api/v1/moderation/contenus/${seconde}`).expect(200))
      .body as DossierModerationApi;
    expect(dossier.signalements.map((s) => [s.motif, s.statut, s.signaleur.pseudo])).toEqual([
      ['AUTRE', 'NON_FONDE', 'awa-sarr'],
      ['PLAGIAT', 'OUVERT', 'awa-sarr'],
    ]);
    expect(dossier.signalements[0]?.precision).toBe('Le prompt recopie un article.');
    expect(dossier.decisions.map((d) => [d.action, d.signalementsClos])).toEqual([['AUCUNE', 1]]);
    expect(
      dossier.historiqueAuteur.map((d) => [d.action, d.membreVise?.pseudo, d.intituleContenu]),
    ).toEqual([['AVERTIR', 'lea-martin', 'Cité imaginaire entre ciel et mer']]);
    expect(dossier.suspensionJusqua).toBeNull();
    expect(dossier.nouvelExamen).toBe(false);
    // Une création se lit sur sa page ; le dossier dit ce que la modération peut en décider.
    expect(dossier).toMatchObject({ texte: null, avertissementAgent: 'AUCUN' });
    expect(dossier.actions).toEqual([
      'AUCUNE',
      'MASQUER',
      'SUPPRIMER',
      'AVERTIR',
      'SUSPENDRE',
      'AJOUTER_AVERTISSEMENT_AGENT',
    ]);
    await moderation.get('/api/v1/moderation/contenus/999999').expect(404);
  });

  it('donne le texte entier d’un commentaire, même masqué (F-91)', async () => {
    const id = await creerCreation(contexte, auteurId);
    const commentaireId = await commenter(id, awaId);
    const moderation = await thomas();
    await decider(moderation, commentaireId, {
      action: 'MASQUER',
      motif: 'Propos blessants.',
    }).expect(201);
    const dossier = (
      await moderation.get(`/api/v1/moderation/contenus/${commentaireId}`).expect(200)
    ).body as DossierModerationApi;
    expect(dossier).toMatchObject({
      contenu: { type: 'COMMENTAIRE', statut: 'MASQUE' },
      texte: 'Le prompt ne donne pas le format attendu.',
      avertissementAgent: null,
      actions: ['AUCUNE', 'RETABLIR', 'SUPPRIMER', 'AVERTIR', 'SUSPENDRE'],
    });
    expect(dossier.decisions[0]?.intituleContenu).toBe('Le prompt ne donne pas le format attendu.');
  });

  describe('participations aux défis (S-17)', () => {
    it('modère un jeu signalé : la file l’ouvre dans la page du défi ; masqué, il n’est plus joué', async () => {
      const [o] = await contexte.db.select({ id: outil.id }).from(outil).limit(1);
      const [d] = await contexte.db
        .insert(defi)
        .values({
          organisateurId: moderateurId,
          titre: 'Deploy Friday',
          slug: 'deploy-friday',
          enonce: 'Faites-en un jeu, en un seul prompt.',
          dateDebut: new Date(Date.now() - 86_400_000),
          dateFin: new Date(Date.now() + 3 * 86_400_000),
          statut: 'PUBLIE',
        })
        .returning({ id: defi.id });
      const auteur = await lea();
      const { id } = (
        await auteur
          .post(`/api/v1/defis/${d!.id}/participations`)
          .set('Origin', ORIGINE_SITE)
          .send({
            titre: 'Hotfix Hero',
            idee: 'Un runner en pixel art où l’horloge sert de niveau.',
            outilId: o!.id,
            prompts: ['Écris un runner complet dans un seul fichier HTML.'],
            jeu: { nom: 'jeu.html', html: '<body><canvas></canvas></body>' },
          })
          .expect(201)
      ).body as { id: number };
      await signaler(await awa(), id, { motif: 'SPAM' }).expect(201);

      const moderation = await thomas();
      const file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file.elements[0]?.contenu).toMatchObject({
        type: 'PARTICIPATION',
        intitule: 'Hotfix Hero',
        page: { genre: 'DEFI', id: d!.id, slug: 'deploy-friday', ancre: String(id) },
        auteur: { pseudo: 'lea-martin' },
      });
      await moderation.get(`/api/v1/moderation/contenus/${id}`).expect(200);
      await decider(moderation, id, {
        action: 'MASQUER',
        motif: 'Le jeu affiche un faux écran de connexion.',
      }).expect(201);
      expect(contexte.emails[0]?.sujet).toBe(
        'Votre participation à un défi a été masquée par la modération',
      );
      await request(serveur())
        .get(`/api/v1/participations/${id}/jeu`)
        .set('Sec-Fetch-Dest', 'iframe')
        .expect(404);
      const page = (await request(serveur()).get('/api/v1/defis').expect(200)).body as {
        participations: unknown[];
      };
      expect(page.participations).toEqual([]);
    });
  });

  describe('masquage automatique au seuil de signalements (F-93, RG-101)', () => {
    /** Membre dont la réputation atteint ce nombre de points (Apprenti dès 50, RG-84). */
    async function membreAvecPoints(pseudo: string, points: number) {
      const membre = await creerMembre(contexte, { pseudo, email: `${pseudo}@example.com` });
      if (points)
        await contexte.db
          .insert(mouvementReputation)
          .values({ beneficiaireId: membre.id, points, motif: 'VOTE_UTILE_RECU' });
      return membre;
    }
    const apprentis = async () => ({
      ibrahima: await membreAvecPoints('ibrahima-sow', 60),
      nadia: await membreAvecPoints('nadia-kone', 300),
      karim: await membreAvecPoints('karim-ba', 50),
    });
    const signalementOuvert = (signaleurId: number, contenuId: number) =>
      contexte.db.insert(signalement).values({ signaleurId, contenuId, motif: 'SPAM' });
    const etat = async (id: number) =>
      (
        await contexte.db
          .select({ statut: contenu.statut, date: contenu.dateMasquageAutomatique })
          .from(contenu)
          .where(eq(contenu.id, id))
      )[0];
    const voter = (agent: Agent, id: number) =>
      agent.put(`/api/v1/contenus/${id}/votes/UTILE`).set('Origin', ORIGINE_SITE).expect(200);

    it('masque au troisième signalement d’un membre de niveau Apprenti ou plus, à titre provisoire', async () => {
      const id = await creerCreation(contexte, auteurId);
      await voter(await awa(), id);
      expect(await reputation(auteurId)).toBe(10);
      const { ibrahima, nadia, karim } = await apprentis();

      // Awa est au niveau Curieux : son signalement ne compte pas pour le seuil.
      await signaler(await awa(), id, { motif: 'SPAM' }).expect(201);
      await signaler(await agentConnecte(ibrahima.email ?? ''), id).expect(201);
      await signaler(await agentConnecte(nadia.email ?? ''), id).expect(201);
      expect(await etat(id)).toEqual({ statut: 'VISIBLE', date: null });
      expect(contexte.emails).toEqual([]);

      await signaler(await agentConnecte(karim.email ?? ''), id, { motif: 'PLAGIAT' }).expect(201);
      const masque = await etat(id);
      expect(masque?.statut).toBe('MASQUE');
      expect(masque?.date).toBeInstanceOf(Date);
      // Aucune décision : les signalements restent ouverts pour la modération.
      expect(await contexte.db.$count(decisionModeration)).toBe(0);
      const ouverts = await contexte.db.select({ statut: signalement.statut }).from(signalement);
      expect(ouverts.map((s) => s.statut)).toEqual(['OUVERT', 'OUVERT', 'OUVERT', 'OUVERT']);
      // RG-82 : les points nés du contenu sont annulés à la date du masquage.
      expect(await reputation(auteurId)).toBe(0);
      const [annulation] = await contexte.db
        .select({ date: mouvementReputation.date })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.motif, 'ANNULATION'));
      expect(annulation?.date).toEqual(masque?.date);

      // L'auteur est prévenu de l'outil automatisé, sans apprendre qui a signalé.
      const recues = (await (await lea()).get('/api/v1/notifications').expect(200))
        .body as NotificationsApi;
      expect(recues.elements[0]).toMatchObject({
        type: 'CONTENU_MASQUE',
        par: null,
        motif: null,
        decision: {
          action: 'MASQUER',
          finSuspension: null,
          automatique: true,
          contenu: { type: 'CREATION', intitule: 'Cité imaginaire entre ciel et mer' },
        },
      });
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['lea@example.com', 'Votre création a été masquée à titre provisoire'],
      ]);
      const [email] = contexte.emails;
      expect(email?.texte).toContain('un outil automatisé l’a masquée à titre provisoire');
      expect(email?.texte).toContain(`Masquage automatique, contenu n° ${id}`);
      for (const signaleur of ['awa-sarr', 'ibrahima-sow', 'nadia-kone', 'karim-ba'])
        expect(email?.texte).not.toContain(signaleur);

      // RG-30 : l'auteur la voit, masquée automatiquement ; les autres, non.
      const vueAuteur = (await (await lea()).get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(vueAuteur.masquage).toEqual({
        date: masque?.date?.toISOString(),
        motif: null,
        signalements: null,
        automatique: true,
      });
      await (await awa()).get(`/api/v1/creations/${id}`).expect(404);
      await signaler(await awa(), id).expect(404);
    });

    it('compte un signalement ouvert par membre distinct, ni les signalements clos ni les comptes fermés', async () => {
      const id = await creerCreation(contexte, auteurId);
      const { ibrahima, nadia } = await apprentis();
      const ferme = await membreAvecPoints('compte-ferme', 1500);
      await contexte.db
        .update(utilisateur)
        .set({ statutCompte: 'BANNI' })
        .where(eq(utilisateur.id, ferme.id));
      await signalementOuvert(ferme.id, id);
      const moderation = await thomas();
      const agentIbrahima = await agentConnecte(ibrahima.email ?? '');
      const agentNadia = await agentConnecte(nadia.email ?? '');

      // Un signalement clos par une décision ne compte plus ; un nouveau signalement compte.
      await signaler(agentIbrahima, id).expect(201);
      await decider(moderation, id, { action: 'AUCUNE', motif: 'Rien à redire.' }).expect(201);
      await signaler(agentIbrahima, id, { motif: 'HORS_SUJET' }).expect(201);
      await signalementOuvert(ferme.id, id);
      await signaler(agentNadia, id).expect(201);
      // CI-21 : un même membre ne signale pas deux fois le même contenu.
      await signaler(agentNadia, id, { motif: 'PLAGIAT' }).expect(409);
      expect(await etat(id)).toEqual({ statut: 'VISIBLE', date: null });

      // RG-85 : un modérateur compte, quel que soit son niveau.
      await signaler(moderation, id).expect(201);
      expect((await etat(id))?.statut).toBe('MASQUE');
    });

    it('passe en tête de la file : la modération confirme, rétablit ou supprime d’abord (RG-104)', async () => {
      const ancienne = await creerCreation(contexte, auteurId);
      const id = await creerCreation(contexte, auteurId);
      const { ibrahima, nadia, karim } = await apprentis();
      await contexte.db.insert(signalement).values({
        signaleurId: awaId,
        contenuId: ancienne,
        motif: 'SPAM',
        date: new Date(Date.now() - 80 * 3_600_000),
      });
      await signalementOuvert(ibrahima.id, id);
      await signalementOuvert(nadia.id, id);
      await signaler(await agentConnecte(karim.email ?? ''), id).expect(201);

      const moderation = await thomas();
      const file = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(file.elements.map((e) => e.contenu.id)).toEqual([id, ancienne]);
      expect(file.elements[0]?.contenu.masquageAutomatique).toEqual(expect.any(String));
      expect(file.elements[0]?.signalements.nombre).toBe(3);
      expect(file.elements[1]?.contenu.masquageAutomatique).toBeNull();

      const dossier = (await moderation.get(`/api/v1/moderation/contenus/${id}`).expect(200))
        .body as DossierModerationApi;
      expect(dossier.contenu).toMatchObject({ statut: 'MASQUE' });
      expect(dossier.actions).toEqual(['MASQUER', 'RETABLIR', 'SUPPRIMER']);
      const vueModeration = (await moderation.get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(vueModeration.masquage).toMatchObject({ automatique: true, signalements: 3 });
      for (const action of ['AUCUNE', 'AVERTIR'])
        expect(
          (await decider(moderation, id, { action, motif: 'Examen.' }).expect(409)).body.detail,
        ).toBe(
          'Ce contenu a été masqué automatiquement : confirmez le masquage, rétablissez ou supprimez le contenu avant toute autre mesure.',
        );

      // RG-104 : l'auteur, s'il est de l'équipe, ne le voit pas dans sa file et n'en décide pas.
      await contexte.db
        .update(utilisateur)
        .set({ role: 'MODERATEUR' })
        .where(eq(utilisateur.id, auteurId));
      const auteurModerateur = await lea();
      const saFile = (await auteurModerateur.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(saFile.elements.map((e) => e.contenu.id)).toEqual([]);
      await decider(auteurModerateur, id, { action: 'RETABLIR', motif: 'Le mien.' }).expect(403);

      // La modération confirme le masquage : il devient une décision, la file reprend son ordre.
      contexte.emails.length = 0;
      const confirmee = (
        await decider(moderation, id, { action: 'MASQUER', motif: 'Publicité répétée.' }).expect(
          201,
        )
      ).body as DecisionApi;
      expect(confirmee.signalementsClos).toBe(3);
      expect(contexte.emails[0]?.sujet).toBe('Votre création a été masquée par la modération');
      const apres = (await moderation.get('/api/v1/moderation/file').expect(200))
        .body as FileModerationApi;
      expect(apres.elements.map((e) => e.contenu.id)).toEqual([ancienne]);
      const confirme = (await moderation.get(`/api/v1/moderation/contenus/${id}`).expect(200))
        .body as DossierModerationApi;
      expect(confirme.contenu.masquageAutomatique).toBeNull();
      expect(confirme.actions).toContain('AVERTIR');
      expect(
        (await (await lea()).get(`/api/v1/creations/${id}`).expect(200)).body.masquage,
      ).toEqual({
        date: confirmee.date,
        motif: 'Publicité répétée.',
        signalements: null,
        automatique: false,
      });
    });

    it('rétablit le contenu et ses points, ceux du seul masquage en cours (RG-82)', async () => {
      const id = await creerCreation(contexte, auteurId);
      await voter(await awa(), id);
      const { ibrahima, nadia, karim } = await apprentis();
      const moderation = await thomas();
      const agentKarim = await agentConnecte(karim.email ?? '');
      const masquerAutomatiquement = async () => {
        await signalementOuvert(ibrahima.id, id);
        await signalementOuvert(nadia.id, id);
        await signaler(agentKarim, id).expect(201);
        expect((await etat(id))?.statut).toBe('MASQUE');
      };

      // Un premier masquage, par décision, puis le rétablissement.
      await decider(moderation, id, { action: 'MASQUER', motif: 'Spam.' }).expect(201);
      await decider(moderation, id, { action: 'RETABLIR', motif: 'Corrigé.' }).expect(201);
      expect(await reputation(auteurId)).toBe(10);

      // Masquage automatique : les points sont annulés, le rétablissement les rend une seule fois.
      await masquerAutomatiquement();
      expect(await reputation(auteurId)).toBe(0);
      contexte.emails.length = 0;
      const retablie = (
        await decider(moderation, id, {
          action: 'RETABLIR',
          motif: 'Signalements infondés.',
        }).expect(201)
      ).body as DecisionApi;
      expect(retablie.signalementsClos).toBe(3);
      expect(await etat(id)).toMatchObject({ statut: 'VISIBLE' });
      expect(await reputation(auteurId)).toBe(10);
      expect(contexte.emails[0]?.sujet).toBe('Votre création est de nouveau visible');
      const clos = await contexte.db
        .select({ statut: signalement.statut })
        .from(signalement)
        .where(eq(signalement.decisionId, retablie.id));
      expect(clos.map((s) => s.statut)).toEqual(['NON_FONDE', 'NON_FONDE', 'NON_FONDE']);
      await (await awa()).get(`/api/v1/creations/${id}`).expect(200);

      // De nouveaux signalements le masquent de nouveau ; une confirmation puis un rétablissement
      // rendent encore les points une seule fois.
      await masquerAutomatiquement();
      expect(await reputation(auteurId)).toBe(0);
      await decider(moderation, id, { action: 'MASQUER', motif: 'Spam confirmé.' }).expect(201);
      await decider(moderation, id, { action: 'RETABLIR', motif: 'Corrigé.' }).expect(201);
      expect(await reputation(auteurId)).toBe(10);
      const mouvements = await contexte.db
        .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, auteurId))
        .orderBy(mouvementReputation.id);
      expect(mouvements.map((m) => [m.motif, m.points])).toEqual([
        ['VOTE_UTILE_RECU', 10],
        ['ANNULATION', -10],
        ['VOTE_UTILE_RECU', 10],
        ['ANNULATION', -10],
        ['VOTE_UTILE_RECU', 10],
        ['ANNULATION', -10],
        ['VOTE_UTILE_RECU', 10],
      ]);
    });
  });

  /** Commentaire visible d'un membre sur une création. */
  async function commenter(creationId: number, auteur: number): Promise<number> {
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'COMMENTAIRE', auteurId: auteur })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Commentaire non créé');
    await contexte.db.insert(commentaire).values({
      id: ligne.id,
      creationId,
      corps: 'Le prompt ne donne pas le format attendu.',
    });
    return ligne.id;
  }
});
