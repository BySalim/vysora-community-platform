import type { ConnexionReussie, ParametresApi, SuppressionDemandeeApi } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  contenu,
  creation,
  demandeDroit,
  enregistrement,
  notification,
  preferenceNotification,
  session,
  utilisateur,
  vote,
} from '../src/db/schema/index.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  cookieRecu,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const JOUR_MS = 24 * 60 * 60_000;

describe('Paramètres du compte (PARAM-01, EC-17)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let awaId: number;
  const serveur = () => contexte.app.getHttpServer();
  type Agent = ReturnType<typeof request.agent>;

  const envoyer = (requete: request.Test) =>
    requete.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);

  async function agentConnecte(
    email = 'awa.sarr@example.com',
    motDePasse = MOT_DE_PASSE,
    navigateur = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36',
  ): Promise<Agent> {
    const agent = request.agent(serveur());
    await envoyer(agent.post('/api/v1/session'))
      .set('User-Agent', navigateur)
      .send({ email, motDePasse })
      .expect(200);
    return agent;
  }

  const parametres = async (agent: Agent) =>
    (await agent.get('/api/v1/moi/parametres').set('X-Forwarded-For', ip).expect(200))
      .body as ParametresApi;

  /** Jeton du dernier lien envoyé à cette adresse (« …?email=… »). */
  const jetonEnvoye = (a: string): string => {
    const email = contexte.emails.findLast((e) => e.a === a);
    const jeton = /[?&]email=([\w-]+)/.exec(email?.texte ?? '')?.[1];
    if (!jeton) throw new Error(`Aucun lien envoyé à ${a}`);
    return jeton;
  };

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    awaId = (await creerMembre(contexte)).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('GET /api/v1/moi/parametres', () => {
    it('présente le compte, l’appareil courant, les préférences et l’export', async () => {
      const awa = await agentConnecte();
      const lus = await parametres(awa);
      expect(lus).toMatchObject({
        pseudo: 'awa-sarr',
        email: 'awa.sarr@example.com',
        emailVerifie: true,
        changementEmail: null,
        fuseauHoraire: 'Africa/Dakar',
        role: 'MEMBRE',
        niveau: { code: 'curieux', libelle: 'Curieux' },
        motDePasseModifieLe: null,
        creationsPubliees: 0,
        export: { etat: 'AUCUN', dateDemande: null },
      });
      expect(lus.appareils).toEqual([
        expect.objectContaining({ nom: 'Chrome sur Windows', actuel: true, telephone: false }),
      ]);
      // WF-25 : réponses à ses sujets et réponses acceptées par e-mail par défaut.
      expect(lus.notifications.email).toBe(true);
      expect(lus.notifications.evenements).toMatchObject({
        REPONSE_SUJET: true,
        REPONSE_ACCEPTEE: true,
        COMMENTAIRE_RECU: false,
        DECISION_MODERATION: true,
      });
    });

    it('est réservée à la personne connectée, même en lecture seule', async () => {
      await request(serveur()).get('/api/v1/moi/parametres').expect(401);
      await contexte.db
        .update(utilisateur)
        .set({ emailVerifie: false })
        .where(eq(utilisateur.id, awaId));
      const awa = await agentConnecte();
      expect((await parametres(awa)).emailVerifie).toBe(false);
    });

    it('enregistre le fuseau horaire choisi dans la liste', async () => {
      const awa = await agentConnecte();
      await envoyer(awa.patch('/api/v1/moi')).send({ fuseauHoraire: 'Europe/Paris' }).expect(200);
      expect((await parametres(awa)).fuseauHoraire).toBe('Europe/Paris');
      const refus = await envoyer(awa.patch('/api/v1/moi'))
        .send({ fuseauHoraire: 'Mars/Olympus' })
        .expect(400);
      expect(refus.body.erreurs.fuseauHoraire).toBe('Choisissez un fuseau de la liste.');
    });
  });

  describe('Changement d’adresse e-mail (F-06, WF-02)', () => {
    it('exige le mot de passe actuel et une autre adresse libre', async () => {
      await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
      const awa = await agentConnecte();
      const changer = (email: string, motDePasse: string) =>
        envoyer(awa.post('/api/v1/moi/email')).send({ email, motDePasse });

      expect((await changer('awa@exemple.sn', 'pas le bon mot').expect(400)).body.erreurs).toEqual({
        motDePasse: 'Ce mot de passe est incorrect.',
      });
      expect(
        (await changer('AWA.SARR@example.com', MOT_DE_PASSE).expect(400)).body.erreurs,
      ).toEqual({ email: 'C’est déjà l’adresse de votre compte.' });
      expect((await changer('lea@example.com', MOT_DE_PASSE).expect(409)).body.erreurs).toEqual({
        email: 'Cette adresse est déjà associée à un compte Vysora.',
      });
      expect(contexte.emails).toHaveLength(0);
    });

    it('envoie un lien à la nouvelle adresse, alerte l’actuelle, puis change l’adresse à la confirmation', async () => {
      const awa = await agentConnecte();
      const apres = (
        await envoyer(awa.post('/api/v1/moi/email'))
          .send({ email: 'awa@exemple.sn', motDePasse: MOT_DE_PASSE })
          .expect(200)
      ).body as ParametresApi;
      expect(apres.email).toBe('awa.sarr@example.com');
      expect(apres.changementEmail?.email).toBe('awa@exemple.sn');
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['awa@exemple.sn', 'Confirmez votre nouvelle adresse e-mail'],
        ['awa.sarr@example.com', 'Changement d’adresse e-mail demandé'],
      ]);
      expect(contexte.emails[1]?.texte).toContain('awa@exemple.sn');

      // Un nouveau lien remplace le précédent ; l'alerte n'est pas répétée.
      const premier = jetonEnvoye('awa@exemple.sn');
      await envoyer(awa.post('/api/v1/moi/email/renvoi')).expect(200);
      expect(contexte.emails).toHaveLength(3);
      const second = jetonEnvoye('awa@exemple.sn');
      const confirmer = (jeton: string) =>
        envoyer(request(serveur()).post('/api/v1/comptes/email/confirmation')).send({ jeton });
      await confirmer(premier).expect(410);

      // Sans session : le lien suffit.
      expect((await confirmer(second).expect(200)).body).toEqual({ email: 'awa@exemple.sn' });
      await confirmer(second).expect(200);
      const lus = await parametres(awa);
      expect(lus).toMatchObject({
        email: 'awa@exemple.sn',
        emailVerifie: true,
        changementEmail: null,
      });
      await agentConnecte('awa@exemple.sn');
    });

    it('n’alerte pas une adresse jamais confirmée et permet d’annuler le changement', async () => {
      await contexte.db
        .update(utilisateur)
        .set({ emailVerifie: false })
        .where(eq(utilisateur.id, awaId));
      const awa = await agentConnecte();
      await envoyer(awa.post('/api/v1/moi/email'))
        .send({ email: 'awa@exemple.sn', motDePasse: MOT_DE_PASSE })
        .expect(200);
      expect(contexte.emails.map((e) => e.a)).toEqual(['awa@exemple.sn']);
      const jeton = jetonEnvoye('awa@exemple.sn');

      const annule = (await envoyer(awa.delete('/api/v1/moi/email')).expect(200))
        .body as ParametresApi;
      expect(annule.changementEmail).toBeNull();
      await envoyer(request(serveur()).post('/api/v1/comptes/email/confirmation'))
        .send({ jeton })
        .expect(410);
      await envoyer(awa.post('/api/v1/moi/email/renvoi')).expect(409);
    });
  });

  describe('Mot de passe et appareils (F-06, ADR-0005)', () => {
    it('exige le mot de passe actuel et applique RG-04 au nouveau', async () => {
      const awa = await agentConnecte();
      const changer = (actuel: string, nouveau: string) =>
        envoyer(awa.put('/api/v1/moi/mot-de-passe')).send({ actuel, nouveau });
      expect(
        (await changer('pas le bon mot', 'un tout autre secret').expect(400)).body.erreurs,
      ).toEqual({ actuel: 'Ce mot de passe est incorrect.' });
      expect((await changer(MOT_DE_PASSE, 'court').expect(400)).body.erreurs.nouveau).toMatch(
        /12 caractères/,
      );
      expect((await changer(MOT_DE_PASSE, MOT_DE_PASSE).expect(400)).body.erreurs).toEqual({
        nouveau: 'Choisissez un mot de passe différent de l’actuel.',
      });
    });

    it('change le mot de passe et déconnecte les autres appareils sur demande', async () => {
      const ici = await agentConnecte();
      const telephone = await agentConnecte(
        'awa.sarr@example.com',
        MOT_DE_PASSE,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',
      );
      const avant = await parametres(ici);
      expect(avant.appareils.map((a) => [a.nom, a.actuel, a.telephone])).toEqual([
        ['Chrome sur Windows', true, false],
        ['Safari sur iPhone', false, true],
      ]);

      const apres = (
        await envoyer(ici.put('/api/v1/moi/mot-de-passe'))
          .send({
            actuel: MOT_DE_PASSE,
            nouveau: 'mangrove indigo kora',
            deconnecterAutres: true,
          })
          .expect(200)
      ).body as ParametresApi;
      expect(apres.motDePasseModifieLe).not.toBeNull();
      expect(apres.appareils).toHaveLength(1);
      await telephone.get('/api/v1/moi/parametres').set('X-Forwarded-For', ip).expect(401);
      await agentConnecte('awa.sarr@example.com', 'mangrove indigo kora');
    });

    it('déconnecte un autre appareil, jamais celui de la requête', async () => {
      const ici = await agentConnecte();
      const ailleurs = await agentConnecte(
        'awa.sarr@example.com',
        MOT_DE_PASSE,
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
      );
      const [actuel, autre] = (await parametres(ici)).appareils;
      await envoyer(ici.delete(`/api/v1/moi/sessions/${actuel?.cle}`)).expect(404);
      await envoyer(ici.delete('/api/v1/moi/sessions/inconnue')).expect(404);
      const apres = (await envoyer(ici.delete(`/api/v1/moi/sessions/${autre?.cle}`)).expect(200))
        .body as ParametresApi;
      expect(apres.appareils.map((a) => a.nom)).toEqual(['Chrome sur Windows']);
      await ailleurs.get('/api/v1/moi/parametres').set('X-Forwarded-For', ip).expect(401);

      await agentConnecte();
      await envoyer(ici.delete('/api/v1/moi/sessions')).expect(200);
      expect(await contexte.db.$count(session, eq(session.utilisateurId, awaId))).toBe(1);
    });
  });

  describe('Préférences d’e-mail par événement (F-81, WF-25)', () => {
    it('envoie les notifications choisies, et rien quand l’envoi par e-mail est coupé', async () => {
      const leaId = (
        await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })
      ).id;
      const creationId = await creerCreation(contexte, awaId);
      const awa = await agentConnecte();
      const lea = await agentConnecte('lea@example.com');
      const notifications = contexte.app.get(NotificationsService);
      const commenter = (corps: string) =>
        envoyer(lea.post(`/api/v1/creations/${creationId}/commentaires`))
          .send({ corps })
          .expect(201);

      // Par défaut, un commentaire reçu reste dans Vysora.
      await commenter('Très clair, merci pour le détail des étapes.');
      await notifications.envoyerEmailsEnAttente();
      expect(contexte.emails).toHaveLength(0);

      const choix = (
        await envoyer(awa.put('/api/v1/moi/preferences-notifications'))
          .send({ evenements: { COMMENTAIRE_RECU: true, DECISION_MODERATION: false } })
          .expect(200)
      ).body as ParametresApi['notifications'];
      expect(choix.evenements).toMatchObject({ COMMENTAIRE_RECU: true, DECISION_MODERATION: true });
      expect(
        await contexte.db.$count(
          preferenceNotification,
          eq(preferenceNotification.utilisateurId, awaId),
        ),
      ).toBe(1);

      await commenter('Et avec un autre modèle, le résultat tient-il ?');
      await notifications.envoyerEmailsEnAttente();
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['awa.sarr@example.com', 'lea-martin a commenté votre création'],
      ]);
      // Une notification ne part qu'une fois.
      await notifications.envoyerEmailsEnAttente();
      expect(contexte.emails).toHaveLength(1);

      await envoyer(awa.put('/api/v1/moi/preferences-notifications'))
        .send({ email: false })
        .expect(200);
      await commenter('Une dernière question sur la troisième étape.');
      await notifications.envoyerEmailsEnAttente();
      expect(contexte.emails).toHaveLength(1);
      expect(leaId).toBeGreaterThan(0);
    });

    it('envoie les votes « Utile » d’un jour le lendemain, en un seul e-mail (RG-91)', async () => {
      const creationId = await creerCreation(contexte, awaId);
      const awa = await agentConnecte();
      await envoyer(awa.put('/api/v1/moi/preferences-notifications'))
        .send({ evenements: { VOTES_UTILE_RECUS: true } })
        .expect(200);
      for (const pseudo of ['lea-martin', 'kofi-mensah']) {
        await creerMembre(contexte, { pseudo, email: `${pseudo}@example.com` });
        const votant = await agentConnecte(`${pseudo}@example.com`);
        await envoyer(votant.put(`/api/v1/contenus/${creationId}/votes/UTILE`)).expect(200);
      }
      const notifications = contexte.app.get(NotificationsService);
      await notifications.envoyerEmailsEnAttente();
      expect(contexte.emails).toHaveLength(0);

      await notifications.envoyerEmailsEnAttente(new Date(Date.now() + JOUR_MS));
      expect(contexte.emails.map((e) => e.sujet)).toEqual(['2 membres ont voté « Utile »']);
      expect(
        await contexte.db.$count(
          notification,
          and(eq(notification.destinataireId, awaId), eq(notification.emailEnAttente, true)),
        ),
      ).toBe(0);
    });
  });

  describe('Export des données (F-07, WF-22)', () => {
    it('prépare le fichier, prévient par e-mail et le laisse télécharger 7 jours', async () => {
      const creationId = await creerCreation(contexte, awaId);
      await contexte.db
        .insert(enregistrement)
        .values({ utilisateurId: awaId, contenuId: creationId });
      const awa = await agentConnecte();
      expect((await parametres(awa)).export.contenu).toMatchObject({
        documents: 2,
        creations: 1,
        enregistrements: 1,
      });
      await awa.get('/api/v1/moi/export/fichier').set('X-Forwarded-For', ip).expect(404);

      const apres = (await envoyer(awa.post('/api/v1/moi/export')).expect(200))
        .body as ParametresApi;
      expect(apres.export.etat).toBe('PRET');
      expect(new Date(apres.export.expiration ?? 0).getTime() - Date.now()).toBeGreaterThan(
        6.9 * JOUR_MS,
      );
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['awa.sarr@example.com', 'Vos données sont prêtes'],
      ]);

      const fichier = await awa
        .get('/api/v1/moi/export/fichier')
        .set('X-Forwarded-For', ip)
        .expect(200);
      expect(fichier.headers['content-disposition']).toMatch(
        /^attachment; filename="vysora-awa-sarr-\d{4}-\d{2}-\d{2}\.json"$/,
      );
      expect(fichier.headers['cache-control']).toBe('no-store');
      const donnees = JSON.parse(fichier.text as string) as Record<string, unknown> & {
        compte: Record<string, unknown>;
        creations: { titre: string }[];
        documents_acceptes: unknown[];
        enregistrements: unknown[];
      };
      expect(donnees.compte).toMatchObject({ pseudo: 'awa-sarr', email: 'awa.sarr@example.com' });
      expect(donnees.compte).not.toHaveProperty('empreinteMotDePasse');
      expect(JSON.stringify(donnees)).not.toContain('argon2');
      expect(donnees.creations.map((c) => c.titre)).toEqual(['Cité imaginaire entre ciel et mer']);
      expect(donnees.documents_acceptes).toHaveLength(2);
      expect(donnees.enregistrements).toHaveLength(1);
    });

    it('n’offre plus le fichier une fois le lien expiré', async () => {
      const awa = await agentConnecte();
      await envoyer(awa.post('/api/v1/moi/export')).expect(200);
      await contexte.db
        .update(demandeDroit)
        .set({ dateExpirationExport: new Date(Date.now() - 1000) })
        .where(eq(demandeDroit.utilisateurId, awaId));
      expect((await parametres(awa)).export.etat).toBe('EXPIRE');
      await awa.get('/api/v1/moi/export/fichier').set('X-Forwarded-For', ip).expect(404);
      // Un nouvel export est possible.
      await envoyer(awa.post('/api/v1/moi/export')).expect(200);
      expect((await parametres(awa)).export.etat).toBe('PRET');
    });
  });

  describe('Suppression du compte (F-08, WF-23, RG-05)', () => {
    const demander = (agent: Agent, motDePasse: string, supprimerCreations = false) =>
      envoyer(agent.post('/api/v1/moi/suppression')).send({ motDePasse, supprimerCreations });

    it('passe le compte en suppression, ferme ses sessions, et la reconnexion l’annule', async () => {
      const awa = await agentConnecte();
      expect((await demander(awa, 'pas le bon mot').expect(400)).body.erreurs).toEqual({
        motDePasse: 'Ce mot de passe est incorrect.',
      });

      const reponse = await demander(awa, MOT_DE_PASSE).expect(200);
      const demande = reponse.body as SuppressionDemandeeApi;
      expect(new Date(demande.dateEffacement).getTime() - Date.now()).toBeGreaterThan(
        29.9 * JOUR_MS,
      );
      expect(cookieRecu(reponse.headers)).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
      const [compte] = await contexte.db
        .select({ statut: utilisateur.statutCompte })
        .from(utilisateur)
        .where(eq(utilisateur.id, awaId));
      expect(compte?.statut).toBe('EN_SUPPRESSION');
      expect(await contexte.db.$count(session, eq(session.utilisateurId, awaId))).toBe(0);
      expect(contexte.emails.map((e) => e.sujet)).toEqual([
        'Votre demande de suppression de compte',
      ]);

      const reconnexion = await envoyer(request(serveur()).post('/api/v1/session'))
        .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
        .expect(200);
      expect((reconnexion.body as ConnexionReussie).suppressionAnnulee).not.toBeNull();
      const [annulee] = await contexte.db
        .select({ statut: demandeDroit.statut })
        .from(demandeDroit)
        .where(eq(demandeDroit.utilisateurId, awaId));
      expect(annulee?.statut).toBe('ANNULEE');
    });

    it('efface les données personnelles au bout de 30 jours et garde les contributions, anonymes', async () => {
      const publieeId = await creerCreation(contexte, awaId);
      const brouillonId = await creerCreation(contexte, awaId, { publiee: false });
      const lea = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
      await contexte.db.insert(vote).values({
        votantId: awaId,
        contenuId: await creerCreation(contexte, lea.id),
        typeVoteCode: 'UTILE',
      });
      const awa = await agentConnecte();
      await demander(awa, MOT_DE_PASSE).expect(200);

      // Avant l'échéance, rien ne change.
      await contexte.taches.lancer('comptes.supprimer');
      expect(contexte.emails).toHaveLength(1);
      await contexte.db
        .update(demandeDroit)
        .set({ dateDemande: new Date(Date.now() - 30 * JOUR_MS - 1000) })
        .where(eq(demandeDroit.utilisateurId, awaId));
      await contexte.taches.lancer('comptes.supprimer');

      const [compte] = await contexte.db
        .select()
        .from(utilisateur)
        .where(eq(utilisateur.id, awaId));
      expect(compte).toMatchObject({
        statutCompte: 'SUPPRIME',
        email: null,
        empreinteMotDePasse: null,
        nomAffiche: null,
        avatar: null,
      });
      expect(compte?.pseudo).toMatch(/^membre-supprime-[0-9a-f]{4,}$/);
      const statuts = await contexte.db
        .select({ id: contenu.id, statut: contenu.statut })
        .from(contenu)
        .innerJoin(creation, eq(creation.id, contenu.id))
        .where(eq(contenu.auteurId, awaId));
      expect(Object.fromEntries(statuts.map((s) => [s.id, s.statut]))).toEqual({
        [publieeId]: 'VISIBLE',
        [brouillonId]: 'SUPPRIME',
      });
      expect(await contexte.db.$count(vote, eq(vote.votantId, awaId))).toBe(1);
      const [demande] = await contexte.db
        .select({ statut: demandeDroit.statut })
        .from(demandeDroit)
        .where(eq(demandeDroit.utilisateurId, awaId));
      expect(demande?.statut).toBe('TRAITEE');
      expect(contexte.emails.map((e) => [e.a, e.sujet])).toEqual([
        ['awa.sarr@example.com', 'Votre demande de suppression de compte'],
        ['awa.sarr@example.com', 'Votre compte Vysora est supprimé'],
      ]);
      // L'adresse est libre ; plus aucune connexion n'est possible.
      await envoyer(request(serveur()).post('/api/v1/session'))
        .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
        .expect(401);
    });

    it('supprime aussi les créations publiées si le membre l’a demandé', async () => {
      const publieeId = await creerCreation(contexte, awaId);
      const awa = await agentConnecte();
      await demander(awa, MOT_DE_PASSE, true).expect(200);
      await contexte.db
        .update(demandeDroit)
        .set({ dateDemande: new Date(Date.now() - 31 * JOUR_MS) })
        .where(eq(demandeDroit.utilisateurId, awaId));
      await contexte.taches.lancer('comptes.supprimer');
      const [publiee] = await contexte.db
        .select({ statut: contenu.statut })
        .from(contenu)
        .where(eq(contenu.id, publieeId));
      expect(publiee?.statut).toBe('SUPPRIME');
    });

    it('refuse la suppression du dernier administrateur (RG-111)', async () => {
      await contexte.db
        .update(utilisateur)
        .set({ role: 'ADMINISTRATEUR' })
        .where(eq(utilisateur.id, awaId));
      const awa = await agentConnecte();
      expect((await demander(awa, MOT_DE_PASSE).expect(409)).body.detail).toMatch(
        /seul administrateur/,
      );
    });
  });
});
