import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  acceptationDocument,
  decisionModeration,
  documentLegal,
  mouvementReputation,
  notification,
  session,
  tentativeConnexion,
  utilisateur,
} from '../src/db/schema/index.js';
import { MOT_DE_PASSE, creerMembre, ouvrirSession, sessionsDe } from './membres.js';
import {
  COOKIE_SESSION,
  ORIGINE_SITE,
  demarrerApplication,
  jetonSession,
  vider,
  type ApplicationDeTest,
} from './outils.js';

let contexte: ApplicationDeTest;
const serveur = () => contexte.app.getHttpServer();
const nettoyer = () => vider(contexte.db, 'utilisateur', 'tentative_connexion');

const inscrire = (corps: object) =>
  request(serveur()).post('/api/v1/comptes').set('Origin', ORIGINE_SITE).send(corps);
const connecter = (corps: object, cookie?: string) => {
  const requete = request(serveur()).post('/api/v1/session').set('Origin', ORIGINE_SITE);
  if (cookie) requete.set('Cookie', cookie);
  return requete.send(corps);
};
const lireSession = (cookie?: string) => {
  const requete = request(serveur()).get('/api/v1/session');
  if (cookie) requete.set('Cookie', cookie);
  return requete;
};

describe('POST /api/v1/comptes (F-01)', () => {
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await contexte.app.close();
  });

  it('crée le compte, propose un pseudo et ouvre la session en lecture seule (RG-02)', async () => {
    const reponse = await inscrire({ email: 'Awa.Sarr@example.com', motDePasse: MOT_DE_PASSE });
    expect(reponse.status).toBe(201);
    expect(reponse.body.etat).toEqual({
      session: 'membre',
      role: 'membre',
      niveau: 'curieux',
      compte: 'email',
    });
    expect(reponse.body.membre.pseudo).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    expect(reponse.body.membre.email).toBe('Awa.Sarr@example.com');

    // ADR-0005 : cookie HttpOnly, SameSite=Lax, jeton jamais stocké en clair.
    const cookie = (reponse.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    const jeton = jetonSession(reponse);
    const [ouverte] = await sessionsDe(contexte.db, reponse.body.membre.id);
    expect(ouverte?.id).toMatch(/^[0-9a-f]{64}$/);
    expect(ouverte?.id).not.toBe(jeton);

    const [compte] = await contexte.db
      .select()
      .from(utilisateur)
      .where(eq(utilisateur.id, reponse.body.membre.id));
    expect(compte?.empreinteMotDePasse).toMatch(/^\$argon2id\$/);
    expect(compte?.emailVerifie).toBe(false);
  });

  it('enregistre l’acceptation des conditions et de la charte en vigueur (RG-03)', async () => {
    const reponse = await inscrire({ email: 'awa@example.com', motDePasse: MOT_DE_PASSE });
    const acceptes = await contexte.db
      .select({ type: documentLegal.type })
      .from(acceptationDocument)
      .innerJoin(documentLegal, eq(documentLegal.id, acceptationDocument.documentLegalId))
      .where(eq(acceptationDocument.utilisateurId, reponse.body.membre.id));
    expect(acceptes.map((d) => d.type).toSorted()).toEqual(['CGU', 'CHARTE']);
  });

  it('refuse une adresse déjà utilisée, sans distinction de casse (RG-02)', async () => {
    await creerMembre(contexte.db, { email: 'awa@example.com' });
    const reponse = await inscrire({ email: 'AWA@example.com', motDePasse: MOT_DE_PASSE });
    expect(reponse.status).toBe(409);
    expect(reponse.body.erreurs).toEqual({
      email: 'Cette adresse est déjà associée à un compte Vysora.',
    });
  });

  it('refuse un mot de passe trop court, compromis ou personnel (RG-04)', async () => {
    const court = await inscrire({ email: 'awa@example.com', motDePasse: 'court' });
    expect(court.status).toBe(400);
    expect(court.body.erreurs.motDePasse).toBe('Votre mot de passe compte 12 caractères au moins.');

    const compromis = await inscrire({ email: 'awa@example.com', motDePasse: 'azerty123456' });
    expect(compromis.body.erreurs.motDePasse).toMatch(/fuites de données connues/);

    const personnel = await inscrire({
      email: 'awa.sarr@example.com',
      motDePasse: 'awa.sarr-2026!',
    });
    expect(personnel.body.erreurs.motDePasse).toBe(
      'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.',
    );
    expect(await contexte.db.select().from(utilisateur)).toHaveLength(0);
  });
});

describe('Pseudo du compte (RG-01)', () => {
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await contexte.app.close();
  });

  const changer = (pseudo: string, cookie?: string) => {
    const requete = request(serveur()).put('/api/v1/compte/pseudo').set('Origin', ORIGINE_SITE);
    if (cookie) requete.set('Cookie', cookie);
    return requete.send({ pseudo });
  };

  it('exige une session', async () => {
    const reponse = await changer('awa-sarr');
    expect(reponse.status).toBe(401);
    expect(reponse.body).toMatchObject({ code: 'NON_AUTHENTIFIE', raison: 'connexion' });
  });

  it('permet de choisir son pseudo avant la vérification de l’e-mail', async () => {
    const membre = await creerMembre(contexte.db, { emailVerifie: false });
    const reponse = await changer('Awa-Sarr', await ouvrirSession(contexte.db, membre.id));
    expect(reponse.status).toBe(200);
    expect(reponse.body.membre.pseudo).toBe('Awa-Sarr');
    expect(reponse.body.etat.compte).toBe('email');
  });

  it('refuse un pseudo déjà pris (sans distinction de casse) ou réservé', async () => {
    await creerMembre(contexte.db, { pseudo: 'awa-sarr' });
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);

    const pris = await changer('AWA-SARR', cookie);
    expect(pris.status).toBe(409);
    expect(pris.body.erreurs).toEqual({
      pseudo: 'Ce pseudo vient d’être pris. Choisissez-en un autre.',
    });

    const reserve = await changer('Moderation', cookie);
    expect(reserve.status).toBe(400);
    expect(reserve.body.erreurs).toEqual({ pseudo: 'Ce pseudo est déjà pris.' });
  });

  it('indique si un pseudo est disponible et propose des variantes libres', async () => {
    await creerMembre(contexte.db, { pseudo: 'awa-sarr' });
    await creerMembre(contexte.db, { pseudo: 'awa-sarr-ia' });
    const membre = await creerMembre(contexte.db, { pseudo: 'kofi' });
    const disponibilite = (pseudo: string, cookie?: string) => {
      const requete = request(serveur()).get('/api/v1/disponibilites/pseudo').query({ pseudo });
      if (cookie) requete.set('Cookie', cookie);
      return requete;
    };

    expect((await disponibilite('lagune-azur-12')).body).toEqual({
      disponible: true,
      propositions: [],
    });
    expect((await disponibilite('Awa-Sarr')).body).toEqual({
      disponible: false,
      propositions: ['awa_sarr', 'awa-sarr-26'],
    });
    expect((await disponibilite('vysora')).body.disponible).toBe(false);
    // Son propre pseudo reste disponible pour soi.
    const cookie = await ouvrirSession(contexte.db, membre.id);
    expect((await disponibilite('Kofi', cookie)).body.disponible).toBe(true);
    expect((await disponibilite('a b')).status).toBe(400);
  });

  it('indique si une adresse est déjà associée à un compte', async () => {
    await creerMembre(contexte.db, { email: 'awa@example.com' });
    const disponibilite = (email: string) =>
      request(serveur())
        .post('/api/v1/disponibilites/email')
        .set('Origin', ORIGINE_SITE)
        .send({ email });
    expect((await disponibilite('Awa@Example.com')).body).toEqual({ disponible: false });
    expect((await disponibilite('kofi@example.com')).body).toEqual({ disponible: true });
  });
});

describe('POST /api/v1/session (F-03)', () => {
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await contexte.app.close();
  });

  it('connecte un membre, ouvre une session et note la tentative', async () => {
    const membre = await creerMembre(contexte.db, { email: 'awa@example.com' });
    const reponse = await connecter({ email: 'AWA@example.com', motDePasse: MOT_DE_PASSE });
    expect(reponse.status).toBe(200);
    expect(reponse.body.etat).toMatchObject({ session: 'membre', compte: 'actif' });
    expect(reponse.body.membre).toMatchObject({ id: membre.id, pseudo: membre.pseudo });
    expect(jetonSession(reponse)).toBeDefined();

    const [compte] = await contexte.db
      .select({ date: utilisateur.dateDerniereConnexion })
      .from(utilisateur)
      .where(eq(utilisateur.id, membre.id));
    expect(compte?.date).toBeInstanceOf(Date);
    const tentatives = await contexte.db.select().from(tentativeConnexion);
    expect(tentatives).toMatchObject([{ utilisateurId: membre.id, reussie: true }]);
  });

  it('renvoie le même message que l’adresse existe ou non', async () => {
    await creerMembre(contexte.db, { email: 'awa@example.com' });
    const mauvais = await connecter({ email: 'awa@example.com', motDePasse: 'pas le bon' });
    const inconnu = await connecter({ email: 'kofi@example.com', motDePasse: 'pas le bon' });
    for (const reponse of [mauvais, inconnu]) {
      expect(reponse.status).toBe(401);
      expect(reponse.body).toMatchObject({
        code: 'IDENTIFIANTS_INCORRECTS',
        title: 'Adresse e-mail ou mot de passe incorrect.',
      });
      expect(jetonSession(reponse)).toBeUndefined();
    }
  });

  it('remplace la session déjà ouverte sur l’appareil (nouveau jeton)', async () => {
    const membre = await creerMembre(contexte.db, { email: 'awa@example.com' });
    const ancienne = await ouvrirSession(contexte.db, membre.id);
    const reponse = await connecter(
      { email: 'awa@example.com', motDePasse: MOT_DE_PASSE },
      ancienne,
    );
    expect(reponse.status).toBe(200);
    expect(`${COOKIE_SESSION}=${jetonSession(reponse)}`).not.toBe(ancienne);
    expect(await sessionsDe(contexte.db, membre.id)).toHaveLength(1);
  });

  it('refuse un compte banni', async () => {
    await creerMembre(contexte.db, { email: 'awa@example.com', statutCompte: 'BANNI' });
    const reponse = await connecter({ email: 'awa@example.com', motDePasse: MOT_DE_PASSE });
    expect(reponse.status).toBe(403);
    expect(jetonSession(reponse)).toBeUndefined();
  });
});

describe('POST /api/v1/session, temporisation après 5 échecs (F-03)', () => {
  // Une application par test : la limite de débit par adresse IP (10 par minute) repart de zéro.
  beforeEach(async () => {
    contexte = await demarrerApplication();
    await nettoyer();
  });
  afterEach(async () => {
    await nettoyer();
    await contexte.app.close();
  });

  it('suspend la connexion 30 secondes, même avec le bon mot de passe, puis la rétablit', async () => {
    await creerMembre(contexte.db, { email: 'awa@example.com' });
    for (let i = 1; i <= 4; i += 1)
      expect((await connecter({ email: 'awa@example.com', motDePasse: 'mauvais' })).status).toBe(
        401,
      );
    const cinquieme = await connecter({ email: 'awa@example.com', motDePasse: 'mauvais' });
    expect(cinquieme.status).toBe(429);
    expect(cinquieme.body).toMatchObject({ code: 'TROP_DE_REQUETES', reessayerDans: 30 });
    expect(cinquieme.headers['retry-after']).toBe('30');

    const pendant = await connecter({ email: 'awa@example.com', motDePasse: MOT_DE_PASSE });
    expect(pendant.status).toBe(429);

    // Une fois le délai écoulé, le bon mot de passe passe et remet le compteur à zéro.
    await contexte.db.execute(
      sql`update tentative_connexion set date = date - interval '31 seconds'`,
    );
    expect((await connecter({ email: 'awa@example.com', motDePasse: MOT_DE_PASSE })).status).toBe(
      200,
    );
    expect((await connecter({ email: 'awa@example.com', motDePasse: 'mauvais' })).status).toBe(401);
  });

  it('temporise aussi une adresse sans compte : rien ne trahit l’existence du compte', async () => {
    for (let i = 1; i <= 4; i += 1) await connecter({ email: 'kofi@example.com', motDePasse: 'x' });
    const reponse = await connecter({ email: 'kofi@example.com', motDePasse: 'x' });
    expect(reponse.status).toBe(429);
    expect(reponse.body.reessayerDans).toBe(30);
  });
});

describe('GET et DELETE /api/v1/session', () => {
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await contexte.app.close();
  });

  it('présente un visiteur sans session', async () => {
    const reponse = await lireSession().expect(200);
    expect(reponse.headers['cache-control']).toBe('no-store');
    expect(reponse.body).toEqual({
      etat: { session: 'visiteur', role: 'membre', niveau: 'curieux', compte: 'actif' },
      membre: null,
      nonLues: 0,
    });
  });

  it('efface le cookie d’une session inconnue ou expirée', async () => {
    const membre = await creerMembre(contexte.db);
    const expiree = await ouvrirSession(contexte.db, membre.id, new Date(Date.now() - 1000));
    for (const cookie of [expiree, `${COOKIE_SESSION}=inconnu`]) {
      const reponse = await lireSession(cookie).expect(200);
      expect(reponse.body.membre).toBeNull();
      expect(String(reponse.headers['set-cookie'])).toMatch(/vysora_session=;/);
    }
  });

  it('calcule le niveau, les notifications et l’état du compte', async () => {
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);
    await contexte.db.insert(mouvementReputation).values([
      { beneficiaireId: membre.id, points: 300, motif: 'VOTE_UTILE_RECU' },
      { beneficiaireId: membre.id, points: 20, motif: 'REPONSE_ACCEPTEE' },
    ]);
    await contexte.db.insert(notification).values([
      { destinataireId: membre.id, type: 'COMMENTAIRE_RECU' },
      { destinataireId: membre.id, type: 'COMMENTAIRE_RECU', estLue: true },
    ]);
    const reponse = await lireSession(cookie).expect(200);
    expect(reponse.body).toMatchObject({
      etat: { session: 'membre', role: 'membre', niveau: 'artisan', compte: 'actif' },
      membre: { id: membre.id, points: 320, suspenduJusqua: null },
      nonLues: 1,
    });
  });

  it('met le compte en lecture seule quand une nouvelle version des conditions entre en vigueur (RG-112)', async () => {
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);
    await contexte.db.insert(documentLegal).values({
      type: 'CGU',
      version: 'test-nouvelle',
      dateEffet: '2026-10-20',
      url: '/cgu',
    });
    try {
      expect((await lireSession(cookie)).body.etat.compte).toBe('conditions');
    } finally {
      await contexte.db.delete(documentLegal).where(eq(documentLegal.version, 'test-nouvelle'));
    }
  });

  it('présente un compte suspendu jusqu’à la fin de la suspension (F-91)', async () => {
    const moderateur = await creerMembre(contexte.db, { role: 'MODERATEUR' });
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);
    const fin = new Date(Date.now() + 3 * 86_400_000);
    await contexte.db.insert(decisionModeration).values({
      decideurId: moderateur.id,
      membreViseId: membre.id,
      action: 'SUSPENDRE',
      motif: 'Propos insultants répétés.',
      dateFinSuspension: fin,
    });
    const reponse = await lireSession(cookie);
    expect(reponse.body.etat.compte).toBe('suspendu');
    expect(reponse.body.membre.suspenduJusqua).toBe(fin.toISOString());

    // Un compte suspendu garde l'accès à ses paramètres, pas à la contribution.
    const pseudo = await request(serveur())
      .put('/api/v1/compte/pseudo')
      .set('Origin', ORIGINE_SITE)
      .set('Cookie', cookie)
      .send({ pseudo: 'nouveau-pseudo' });
    expect(pseudo.status).toBe(200);
  });

  it('ferme la session de l’appareil à la déconnexion', async () => {
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);
    const autre = await ouvrirSession(contexte.db, membre.id);

    const reponse = await request(serveur())
      .delete('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('Cookie', cookie)
      .expect(204);
    expect(String(reponse.headers['set-cookie'])).toMatch(/vysora_session=;/);
    expect((await lireSession(cookie)).body.membre).toBeNull();
    // Les autres appareils restent connectés.
    expect((await lireSession(autre)).body.membre?.id).toBe(membre.id);
  });

  it('refuse une déconnexion venue d’une autre origine (CSRF)', async () => {
    const membre = await creerMembre(contexte.db);
    const cookie = await ouvrirSession(contexte.db, membre.id);
    await request(serveur())
      .delete('/api/v1/session')
      .set('Origin', 'https://site-malveillant.example')
      .set('Cookie', cookie)
      .expect(403);
    await request(serveur()).delete('/api/v1/session').set('Cookie', cookie).expect(403);
    expect(await contexte.db.select().from(session)).toHaveLength(1);
  });
});
