import { randomUUID } from 'node:crypto';
import { valeurChoixCookies, type MesureAudienceApi } from '@vysora/shared';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import {
  audienceCompteur,
  audienceVisiteur,
  parcoursEtape,
  parcoursVisite,
} from '../src/db/schema/index.js';
import { ConservationService } from '../src/modules/taches/conservation.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const choix = (audience: boolean, parcours: boolean) =>
  `vysora_consentement=${valeurChoixCookies({ audience, parcours, date: '2026-11-15' })}`;
const TABLES = [
  'utilisateur',
  'audience_compteur',
  'audience_visiteur',
  'parcours_visite',
  'parcours_etape',
];

describe('Mesure d’audience et parcours (LEG-03)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();

  /** Page servie, signalée par le serveur du site avec le cookie et l'adresse de la personne. */
  const page = (
    corps: Record<string, unknown>,
    { cookie, ip = ipDeTest() }: { cookie?: string; ip?: string } = {},
  ) => {
    const appel = request(serveur())
      .post('/api/v1/audience/pages')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip);
    if (cookie) appel.set('Cookie', cookie);
    return appel.send({ statut: 200, userAgent: CHROME, ...corps }).expect(204);
  };

  const compteurs = () => contexte.db.select().from(audienceCompteur);
  const compteur = async (mesure: string, valeur: string, detail = '') =>
    (await compteurs()).find(
      (c) => c.mesure === mesure && c.valeur === valeur && c.detail === detail,
    )?.nombre ?? 0;

  async function administrateur(): Promise<TestAgent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({ email: 'claire@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'claire@example.com');
    return agent;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    await vider(contexte.db, ...TABLES);
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
  });

  afterAll(async () => {
    await vider(contexte.db, ...TABLES);
    await contexte.app.close();
  });

  it('compte pages, visiteurs, arrivées et appareils sans rien garder de la personne', async () => {
    const ip = ipDeTest();
    await page({ adresse: '/explorer?utm_medium=x', referent: null }, { ip });
    await page({ adresse: '/forum', referent: 'http://localhost:4321/explorer' }, { ip });
    await page({ adresse: '/forum', referent: 'https://www.google.com/' }, { ip: ipDeTest() });
    await page({
      adresse: '/creations/12-cite',
      userAgent: IPHONE,
      referent: 'https://chatgpt.com/',
    });
    await page({ adresse: '/page-disparue', statut: 404 });
    await page({ adresse: '/%3Cscript%3E', statut: 404 });
    await page({ adresse: '/forum', statut: 500 });
    // Ni un robot, ni une page de l'équipe, ni une adresse hors du site.
    await page({ adresse: '/forum', userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' });
    await page({ adresse: '/forum', userAgent: 'Mozilla/5.0; compatible; ChatGPT-User/1.0' });
    await page({ adresse: '/admin/roles' });
    await page({ adresse: '/admin/inconnue', statut: 404 });
    await page({ adresse: 'https://exemple.com/' });

    expect(await compteur('PAGE', '/explorer')).toBe(1);
    expect(await compteur('PAGE', '/forum')).toBe(2);
    expect(await compteur('PAGE', '/creations/12-cite')).toBe(1);
    expect(await compteur('PROVENANCE', '(direct)')).toBe(1);
    expect(await compteur('PROVENANCE', 'google.com')).toBe(1);
    expect(await compteur('PROVENANCE', 'chatgpt.com')).toBe(1);
    // Même personne (adresse et navigateur) sur deux pages : un seul visiteur du jour.
    expect(await compteur('VISITEURS', '')).toBe(3);
    expect(await compteur('APPAREIL', 'ORDINATEUR')).toBe(2);
    expect(await compteur('APPAREIL', 'MOBILE')).toBe(1);
    expect(await compteur('NAVIGATEUR', 'SAFARI')).toBe(1);
    expect(await compteur('INTROUVABLE', '/page-disparue')).toBe(1);
    expect(await compteur('INTROUVABLE', '(autre)')).toBe(1);
    expect(await compteur('ERREUR_PAGE', '/forum')).toBe(1);
    expect((await compteurs()).filter((c) => c.valeur.startsWith('/admin'))).toEqual([]);

    // Aucune adresse IP ni nom de navigateur : seulement des empreintes du jour.
    const visiteurs = await contexte.db.select().from(audienceVisiteur);
    expect(visiteurs).toHaveLength(3);
    expect(Object.keys(visiteurs[0] ?? {}).toSorted()).toEqual(['empreinte', 'jour']);
    expect(JSON.stringify(visiteurs)).not.toContain(ip);
    expect(await contexte.db.$count(parcoursVisite)).toBe(0);
  });

  it('ne compte rien pour qui refuse la mesure, dans le bandeau ou sur l’ancienne page Cookies', async () => {
    await page({ adresse: '/forum' }, { cookie: choix(false, false) });
    await page({ adresse: '/forum' }, { cookie: 'vysora_audience=refusee' });
    await page({ adresse: '/forum', statut: 404 }, { cookie: choix(false, false) });
    expect(await compteurs()).toEqual([]);
    expect(await contexte.db.$count(audienceVisiteur)).toBe(0);

    // Un choix d'accepter la mesure remplace l'ancien refus.
    await page({ adresse: '/forum' }, { cookie: `vysora_audience=refusee; ${choix(true, false)}` });
    expect(await compteur('PAGE', '/forum')).toBe(1);
  });

  it('ne suit une visite qu’avec l’accord de la personne et son cookie de visite', async () => {
    const visite = randomUUID();
    // Sans accord, l'identifiant de visite est ignoré ; la mesure anonyme s'applique.
    await page({ adresse: '/forum', parcours: visite }, { cookie: choix(true, false) });
    await page({ adresse: '/forum', parcours: visite });
    expect(await contexte.db.$count(parcoursVisite)).toBe(0);

    await vider(contexte.db, 'audience_compteur', 'audience_visiteur');

    // Avec accord, même si la mesure anonyme est refusée.
    const cookie = `${choix(false, true)}; vysora_parcours=${visite}`;
    await page({ adresse: '/', parcours: visite, referent: 'https://www.qwant.com/' }, { cookie });
    await page(
      { adresse: '/inscription', parcours: visite, referent: 'http://localhost:4321/' },
      { cookie },
    );
    expect(await compteurs()).toEqual([]);

    // Inscription réussie : l'API l'inscrit dans la visite, sans lien avec le compte.
    await request(serveur())
      .post('/api/v1/comptes')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .set('User-Agent', CHROME)
      .set('Cookie', cookie)
      .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE, accepteConditions: true })
      .expect(201);
    // Connexion refusée : erreur de l'action, avec son code.
    await request(serveur())
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .set('User-Agent', CHROME)
      .set('Cookie', cookie)
      .send({ email: 'claire@example.com', motDePasse: 'pas le bon mot de passe' })
      .expect(401);
    // Erreur d'un script, et recherche (sans les mots cherchés).
    for (const corps of [
      { type: 'ERREUR', page: '/inscription', message: 'TypeError: x is undefined' },
      { type: 'RECHERCHE', page: '/inscription' },
    ])
      await request(serveur())
        .post('/api/v1/audience/evenements')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ipDeTest())
        .set('User-Agent', CHROME)
        .set('Cookie', cookie)
        .send(corps)
        .expect(204);

    const [suivie] = await contexte.db.select().from(parcoursVisite);
    expect(suivie).toMatchObject({
      id: visite,
      provenance: 'qwant.com',
      appareil: 'ORDINATEUR',
      navigateur: 'CHROME',
      systeme: 'WINDOWS',
      nbPages: 2,
      nbErreurs: 2,
      nbEtapes: 6,
    });
    const etapes = await contexte.db
      .select({
        nature: parcoursEtape.nature,
        valeur: parcoursEtape.valeur,
        detail: parcoursEtape.detail,
      })
      .from(parcoursEtape)
      .orderBy(parcoursEtape.rang);
    expect(etapes).toEqual([
      { nature: 'PAGE', valeur: '/', detail: '' },
      { nature: 'PAGE', valeur: '/inscription', detail: '' },
      { nature: 'EVENEMENT', valeur: 'INSCRIPTION', detail: '' },
      { nature: 'ERREUR', valeur: 'POST /api/v1/session', detail: 'IDENTIFIANTS_INCORRECTS' },
      { nature: 'ERREUR', valeur: '/inscription', detail: 'TypeError: x is undefined' },
      { nature: 'EVENEMENT', valeur: 'RECHERCHE', detail: '' },
    ]);
    // Mesure anonyme refusée : l'erreur du script n'est pas comptée.
    expect(await compteurs()).toEqual([]);

    // Un identifiant de visite illisible n'enregistre rien.
    await request(serveur())
      .post('/api/v1/audience/evenements')
      .set('Origin', ORIGINE_SITE)
      .set('User-Agent', CHROME)
      .set('Cookie', `${choix(true, true)}; vysora_parcours=pas-un-identifiant`)
      .send({ type: 'RECHERCHE', page: '/' })
      .expect(204);
    expect(await contexte.db.$count(parcoursVisite)).toBe(1);
  });

  it('donne le tableau aux administrateurs seulement', async () => {
    const visite = randomUUID();
    const cookie = `${choix(true, true)}; vysora_parcours=${visite}`;
    const ip = ipDeTest();
    await page({ adresse: '/', parcours: visite }, { cookie, ip });
    await page(
      { adresse: '/forum', parcours: visite, referent: 'http://localhost:4321/' },
      { cookie, ip },
    );
    await page(
      { adresse: '/forum/sujet-introuvable', statut: 404, parcours: visite },
      { cookie, ip },
    );
    await page({ adresse: '/forum', referent: 'https://www.google.com/' });
    await request(serveur())
      .post('/api/v1/audience/evenements')
      .set('Origin', ORIGINE_SITE)
      .set('User-Agent', CHROME)
      .send({
        type: 'ERREUR',
        page: '/forum?jeton=secret',
        message: 'Échec https://vysora.site/x?jeton=secret',
      })
      .expect(204);

    await creerMembre(contexte, {
      pseudo: 'thomas-diallo',
      email: 'thomas@example.com',
      role: 'MODERATEUR',
    });
    const moderateur = request.agent(serveur());
    await moderateur
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({ email: 'thomas@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'thomas@example.com');
    await moderateur.get('/api/v1/admin/audience').expect(403);
    await request(serveur()).get('/api/v1/admin/audience').expect(401);

    const admin = await administrateur();
    await admin.get('/api/v1/admin/audience?jours=12').expect(400);
    const mesure: MesureAudienceApi = (
      await admin.get('/api/v1/admin/audience?jours=7').expect(200)
    ).body;
    expect(mesure.jours).toBe(7);
    expect(mesure.parJour).toHaveLength(7);
    expect(mesure.parJour.at(-1)).toMatchObject({ jour: mesure.au, pagesVues: 3 });
    expect(mesure.chiffres).toEqual({ visiteurs: 2, visites: 2, pagesVues: 3, problemes: 2 });
    expect(mesure.pages).toEqual([
      { valeur: '/forum', nombre: 2 },
      { valeur: '/', nombre: 1 },
    ]);
    expect(mesure.provenances).toEqual([
      { valeur: '(direct)', nombre: 1 },
      { valeur: 'google.com', nombre: 1 },
    ]);
    expect(mesure.appareils).toEqual([{ code: 'ORDINATEUR', nombre: 2 }]);
    expect(mesure.problemes.introuvables).toEqual([
      { valeur: '/forum/sujet-introuvable', nombre: 1 },
    ]);
    expect(mesure.problemes.erreursNavigateur).toEqual([
      { page: '/forum', message: 'Échec https://vysora.site/x', nombre: 1 },
    ]);
    expect(mesure.parcours).toMatchObject({
      visites: 1,
      pagesParVisite: 2,
      entrees: [{ valeur: '/', nombre: 1 }],
      sorties: [{ valeur: '/forum', nombre: 1 }],
      enchainements: [{ de: '/', vers: '/forum', nombre: 1 }],
      inscription: { visitesPageInscription: 0, visitesInscrites: 0 },
    });
    expect(mesure.parcours.avecErreur).toHaveLength(1);
    expect(mesure.parcours.avecErreur[0]?.etapes.map((e) => e.nature)).toEqual([
      'PAGE',
      'PAGE',
      'ERREUR',
    ]);
  });

  it('efface empreintes, compteurs et visites suivies à leur échéance', async () => {
    await contexte.db.insert(audienceCompteur).values([
      { jour: '2024-09-30', mesure: 'PAGE', valeur: '/' },
      { jour: '2024-11-20', mesure: 'PAGE', valeur: '/' },
    ]);
    await contexte.db.insert(audienceVisiteur).values([
      { jour: '2026-11-12', empreinte: 'a'.repeat(64) },
      { jour: '2026-11-14', empreinte: 'b'.repeat(64) },
    ]);
    const ancienne = randomUUID();
    await contexte.db.insert(parcoursVisite).values([
      {
        id: ancienne,
        debut: new Date('2026-08-01T10:00:00Z'),
        derniere: new Date('2026-08-01T10:05:00Z'),
        provenance: '(direct)',
        appareil: 'MOBILE',
        navigateur: 'SAFARI',
        systeme: 'IOS',
      },
      {
        id: randomUUID(),
        debut: new Date('2026-11-01T10:00:00Z'),
        derniere: new Date('2026-11-01T10:05:00Z'),
        provenance: '(direct)',
        appareil: 'MOBILE',
        navigateur: 'SAFARI',
        systeme: 'IOS',
      },
    ]);
    await contexte.db
      .insert(parcoursEtape)
      .values({ visiteId: ancienne, rang: 1, nature: 'PAGE', valeur: '/' });

    const bilan = await contexte.app
      .get(ConservationService)
      .appliquer(new Date('2026-11-15T12:00:00Z'));
    expect(bilan).toMatchObject({ compteursAudience: 1, visiteursAudience: 1, visitesSuivies: 1 });
    expect(await contexte.db.$count(audienceCompteur)).toBe(1);
    expect(await contexte.db.$count(audienceVisiteur)).toBe(1);
    expect(await contexte.db.$count(parcoursVisite)).toBe(1);
    expect(await contexte.db.$count(parcoursEtape)).toBe(0);
  });
});
