import { readdir, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import type { MediaApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import request from 'supertest';
import { lireConfiguration } from '../src/config/env.js';
import { contenu, media, utilisateur } from '../src/db/schema/index.js';
import {
  IMAGES_EN_ATTENTE_PAR_MEMBRE,
  MediasService,
} from '../src/modules/medias/medias.service.js';
import { Stockage, cleFichier, nouvelIdentifiantFichier } from '../src/modules/medias/stockage.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  cookieRecu,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const JOUR_MS = 24 * 60 * 60_000;
/** Dossier propre aux tests (vitest.config.e2e.ts), vidé avant chaque test : jamais celui du développement. */
const DOSSIER_STOCKAGE_TEST = lireConfiguration().STOCKAGE_DOSSIER;
if (!DOSSIER_STOCKAGE_TEST.includes('vysora-test-stockage'))
  throw new Error(`Dossier d'images refusé pour les tests : ${DOSSIER_STOCKAGE_TEST}`);

const png = (largeur: number, hauteur: number) =>
  sharp({ create: { width: largeur, height: hauteur, channels: 3, background: '#d9822b' } })
    .png()
    .toBuffer();

/** Clés présentes dans le dossier de stockage des tests. */
async function fichiersStockes(): Promise<string[]> {
  const cles: string[] = [];
  const dossiers = await readdir(DOSSIER_STOCKAGE_TEST).catch(() => []);
  for (const dossier of dossiers)
    cles.push(...(await readdir(join(DOSSIER_STOCKAGE_TEST, dossier))));
  return cles.toSorted();
}

const cleDe = (url: string) => url.split('/').at(-1) as string;

describe('Médias (MEDIA-01, RG-16)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();

  /** Agent connecté, qui envoie l'origine du site et l'adresse du test. */
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

  const televerser = (
    agent: ReturnType<typeof request.agent>,
    fichier: Buffer,
    nom = 'photo.png',
  ) =>
    agent
      .post('/api/v1/medias')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .attach('fichier', fichier, { filename: nom, contentType: 'image/png' });

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'media', 'contenu');
    await rm(DOSSIER_STOCKAGE_TEST, { recursive: true, force: true });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'media', 'contenu');
    await contexte.app.close();
  });

  describe('POST /api/v1/medias', () => {
    it('refuse un visiteur et un compte en lecture seule, sans rien enregistrer', async () => {
      const visiteur = await request(serveur())
        .post('/api/v1/medias')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .attach('fichier', await png(40, 40), 'photo.png')
        .expect(401);
      expect(visiteur.body.raison).toBe('connexion');

      await creerMembre(contexte, { emailVerifie: false });
      const agent = await agentConnecte();
      const lectureSeule = await televerser(agent, await png(40, 40)).expect(403);
      expect(lectureSeule.body.raison).toBe('email');
      expect(await contexte.db.$count(media)).toBe(0);
      expect(await fichiersStockes()).toEqual([]);
    });

    it('ré-encode l’image en WebP de 720 et 1280 pixels et l’enregistre sans rattachement', async () => {
      const membre = await creerMembre(contexte);
      const agent = await agentConnecte();
      const reponse = await televerser(agent, await png(2000, 1500))
        .field('texteAlternatif', '  Maisons colorées de Gorée  ')
        .field('legende', 'Essai retenu')
        .expect(201);

      const image = reponse.body as MediaApi;
      expect(image).toMatchObject({
        largeur: 1280,
        hauteur: 960,
        texteAlternatif: 'Maisons colorées de Gorée',
        legende: 'Essai retenu',
      });
      expect(image.declinaisons.map((d) => d.largeur)).toEqual([720, 1280]);
      expect(image.url).toBe(image.declinaisons[1]?.url);
      expect(image.url).toMatch(/^\/api\/v1\/fichiers\/[A-Za-z0-9_-]{22}-1280\.webp$/);
      // Le nom du fichier envoyé n'entre pas dans la clé.
      expect(image.url).not.toContain('photo');

      const [ligne] = await contexte.db.select().from(media).where(eq(media.id, image.id));
      expect(ligne).toMatchObject({
        televerseurId: membre.id,
        contenuId: null,
        echangeId: null,
        typeMime: 'image/png',
        largeur: 1280,
        hauteur: 960,
      });
      expect(await fichiersStockes()).toEqual(
        image.declinaisons.map((d) => cleDe(d.url)).toSorted(),
      );
    });

    it('refuse un fichier déguisé, trop lourd, absent ou en double, avec la raison sous le champ', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();

      const deguise = await televerser(
        agent,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
        'photo.png',
      ).expect(400);
      expect(deguise.body.erreurs).toEqual({
        fichier: 'Ce fichier n’est pas une image PNG, JPEG, WebP ou GIF.',
      });

      const lourd = Buffer.concat([await png(10, 10), Buffer.alloc(5 * 1024 * 1024)]);
      const tropLourd = await televerser(agent, lourd).expect(400);
      expect(tropLourd.body.erreurs).toEqual({
        fichier: 'Cette image dépasse 5 Mo. Réduisez-la avant de l’ajouter.',
      });

      const absent = await agent
        .post('/api/v1/medias')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .field('texteAlternatif', 'Sans image')
        .expect(400);
      expect(absent.body.erreurs).toEqual({ fichier: 'Choisissez une image.' });

      const deux = await televerser(agent, await png(10, 10))
        .attach('fichier', await png(10, 10), 'seconde.png')
        .expect(400);
      expect(deux.body.erreurs).toEqual({ fichier: 'Ajoutez une image à la fois.' });

      const description = await televerser(agent, await png(10, 10))
        .field('texteAlternatif', 'a'.repeat(251))
        .expect(400);
      expect(description.body.erreurs).toEqual({
        texteAlternatif: 'La description compte 250 caractères au plus.',
      });

      expect(await contexte.db.$count(media)).toBe(0);
      expect(await fichiersStockes()).toEqual([]);
    });

    it(`limite à ${IMAGES_EN_ATTENTE_PAR_MEMBRE} les images déposées et pas encore enregistrées`, async () => {
      const membre = await creerMembre(contexte);
      await contexte.db.insert(media).values(
        Array.from({ length: IMAGES_EN_ATTENTE_PAR_MEMBRE }, () => ({
          televerseurId: membre.id,
          fichier: cleFichier(nouvelIdentifiantFichier(), 720),
          typeMime: 'image/png' as const,
          tailleOctets: 100,
          texteAlternatif: '',
        })),
      );
      const agent = await agentConnecte();
      const reponse = await televerser(agent, await png(10, 10)).expect(429);
      expect(reponse.body.code).toBe('LIMITE_ATTEINTE');
    });
  });

  describe('GET /api/v1/fichiers/:cle', () => {
    it('sert le fichier en WebP, en cache sans limite, sans lire ni renouveler la session', async () => {
      await creerMembre(contexte);
      const agent = await agentConnecte();
      const image = (await televerser(agent, await png(900, 600)).expect(201)).body as MediaApi;

      const reponse = await agent.get(image.url).buffer(true).expect(200);
      expect(reponse.headers['content-type']).toBe('image/webp');
      expect(reponse.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(reponse.headers['x-content-type-options']).toBe('nosniff');
      expect(cookieRecu(reponse.headers)).toBeUndefined();
      const lu = await sharp(reponse.body as Buffer).metadata();
      expect([lu.format, lu.width, lu.height, lu.exif]).toEqual(['webp', 900, 600, undefined]);

      // Un cookie invalide serait effacé si la session était lue : il ne l'est pas.
      const avecCookieInvalide = await request(serveur())
        .get(image.url)
        .set('Cookie', 'vysora_session=jeton-inconnu')
        .expect(200);
      expect(cookieRecu(avecCookieInvalide.headers)).toBeUndefined();
    });

    it('répond 404 pour une clé inconnue ou qui tente de sortir du dossier', async () => {
      for (const cle of [cleFichier(nouvelIdentifiantFichier(), 720), '..%2F..%2F.env', 'x.webp']) {
        const reponse = await request(serveur()).get(`/api/v1/fichiers/${cle}`).expect(404);
        expect(reponse.headers['content-type']).toContain('application/problem+json');
      }
    });
  });

  describe('PATCH et DELETE /api/v1/medias/:id', () => {
    it('laisse le membre décrire et retirer ses images, pas celles des autres', async () => {
      await creerMembre(contexte);
      await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
      const awa = await agentConnecte();
      const image = (await televerser(awa, await png(300, 200)).expect(201)).body as MediaApi;

      const kofi = await agentConnecte('kofi@example.com');
      await kofi
        .patch(`/api/v1/medias/${image.id}`)
        .set('Origin', ORIGINE_SITE)
        .send({ texteAlternatif: 'Autre' })
        .expect(404);
      await kofi.delete(`/api/v1/medias/${image.id}`).set('Origin', ORIGINE_SITE).expect(404);
      await awa.patch('/api/v1/medias/abc').set('Origin', ORIGINE_SITE).send({}).expect(404);

      const decrite = await awa
        .patch(`/api/v1/medias/${image.id}`)
        .set('Origin', ORIGINE_SITE)
        .send({ texteAlternatif: 'Coucher de soleil sur le fleuve', legende: '' })
        .expect(200);
      expect(decrite.body).toMatchObject({
        texteAlternatif: 'Coucher de soleil sur le fleuve',
        legende: null,
      });

      await awa.delete(`/api/v1/medias/${image.id}`).set('Origin', ORIGINE_SITE).expect(204);
      expect(await contexte.db.$count(media)).toBe(0);
      expect(await fichiersStockes()).toEqual([]);
    });

    it('refuse de retirer ainsi une image enregistrée dans un contenu', async () => {
      const membre = await creerMembre(contexte);
      const agent = await agentConnecte();
      const image = (await televerser(agent, await png(300, 200)).expect(201)).body as MediaApi;
      const [cree] = await contexte.db
        .insert(contenu)
        .values({ typeContenu: 'CREATION', auteurId: membre.id })
        .returning();
      await contexte.db.update(media).set({ contenuId: cree?.id }).where(eq(media.id, image.id));

      const reponse = await agent
        .delete(`/api/v1/medias/${image.id}`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
      expect(reponse.body.detail).toBe(
        'Cette image fait partie d’un contenu enregistré : retirez-la depuis ce contenu.',
      );
    });
  });

  describe('Photo de profil (PUT et DELETE /api/v1/moi/avatar)', () => {
    it('remplace la photo, l’affiche dans la session et supprime l’ancienne', async () => {
      const membre = await creerMembre(contexte);
      const agent = await agentConnecte();
      const envoyer = async (fichier: Buffer) =>
        (
          await agent
            .put('/api/v1/moi/avatar')
            .set('Origin', ORIGINE_SITE)
            .set('X-Forwarded-For', ip)
            .attach('fichier', fichier, 'moi.jpg')
            .expect(200)
        ).body.avatar as string;

      const premiere = await envoyer(await png(800, 600));
      expect(premiere).toMatch(/^\/api\/v1\/fichiers\/[A-Za-z0-9_-]{22}-256\.webp$/);
      const lue = await sharp(
        (await agent.get(premiere).buffer(true).expect(200)).body as Buffer,
      ).metadata();
      expect([lue.width, lue.height]).toEqual([256, 256]);
      expect((await agent.get('/api/v1/session').expect(200)).body.membre.avatar).toBe(premiere);

      const seconde = await envoyer(await png(300, 300));
      expect(await fichiersStockes()).toEqual([cleDe(seconde)]);
      const [ligne] = await contexte.db
        .select({ avatar: utilisateur.avatar })
        .from(utilisateur)
        .where(eq(utilisateur.id, membre.id));
      expect(ligne?.avatar).toBe(cleDe(seconde));

      const retrait = await agent
        .delete('/api/v1/moi/avatar')
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(retrait.body).toEqual({ avatar: null });
      expect(await fichiersStockes()).toEqual([]);
      expect((await agent.get('/api/v1/session').expect(200)).body.membre.avatar).toBeNull();
    });

    it('réserve le changement de photo aux comptes actifs, le retrait reste possible', async () => {
      await creerMembre(contexte, { documentsAcceptes: false });
      const agent = await agentConnecte();
      const refus = await agent
        .put('/api/v1/moi/avatar')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .attach('fichier', await png(64, 64), 'moi.png')
        .expect(403);
      expect(refus.body.raison).toBe('conditions');
      await agent.delete('/api/v1/moi/avatar').set('Origin', ORIGINE_SITE).expect(200);
    });
  });

  describe('Nettoyage', () => {
    it('supprime les images jamais rattachées depuis 24 heures et les fichiers sans ligne', async () => {
      const membre = await creerMembre(contexte);
      const agent = await agentConnecte();
      const ancienne = (await televerser(agent, await png(300, 200)).expect(201)).body as MediaApi;
      const recente = (await televerser(agent, await png(300, 200)).expect(201)).body as MediaApi;
      const rattachee = (await televerser(agent, await png(300, 200)).expect(201)).body as MediaApi;
      const avatar = (
        await agent
          .put('/api/v1/moi/avatar')
          .set('Origin', ORIGINE_SITE)
          .set('X-Forwarded-For', ip)
          .attach('fichier', await png(64, 64), 'moi.png')
          .expect(200)
      ).body.avatar as string;

      const ilYADeuxJours = new Date(Date.now() - 2 * JOUR_MS);
      const [cree] = await contexte.db
        .insert(contenu)
        .values({ typeContenu: 'CREATION', auteurId: membre.id })
        .returning();
      await contexte.db
        .update(media)
        .set({ dateTeleversement: ilYADeuxJours })
        .where(eq(media.televerseurId, membre.id));
      await contexte.db
        .update(media)
        .set({ dateTeleversement: new Date() })
        .where(eq(media.id, recente.id));
      await contexte.db
        .update(media)
        .set({ contenuId: cree?.id })
        .where(eq(media.id, rattachee.id));

      // Fichier sans ligne : envoi interrompu, ou contenu supprimé avec ses images.
      const stockage = contexte.app.get(Stockage);
      const perdu = cleFichier(nouvelIdentifiantFichier(), 720);
      await stockage.ecrire(perdu, await png(10, 10));
      const recentPerdu = cleFichier(nouvelIdentifiantFichier(), 720);
      await stockage.ecrire(recentPerdu, await png(10, 10));
      for (const cle of [perdu, cleDe(avatar), ...ancienne.declinaisons.map((d) => cleDe(d.url))])
        await utimes(
          join(DOSSIER_STOCKAGE_TEST, cle.slice(0, 2), cle),
          ilYADeuxJours,
          ilYADeuxJours,
        );

      const bilan = await contexte.app.get(MediasService).nettoyer();
      expect(bilan).toEqual({ images: 1, fichiers: 1 });
      expect(
        (await contexte.db.select({ id: media.id }).from(media)).map((m) => m.id).toSorted(),
      ).toEqual([recente.id, rattachee.id].toSorted());
      expect(await fichiersStockes()).toEqual(
        [recentPerdu, cleDe(avatar), cleDe(recente.url), cleDe(rattachee.url)].toSorted(),
      );
    });
  });
});
