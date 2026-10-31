import type {
  BadgeAdministreApi,
  CategorieAdministreeApi,
  LicenceAdministreeApi,
  ListeEtiquettesAdministreesApi,
  ProfilApi,
  ReferentielsApi,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { badge, journalAudit, licence } from '../src/db/schema/index.js';
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

describe('Référentiels des contenus (ADM-02, F-95, RG-110)', () => {
  let contexte: ApplicationDeTest;
  let a: ReturnType<typeof request.agent>;
  let adminId: number;

  const publics = async () =>
    (await request(contexte.app.getHttpServer()).get('/api/v1/referentiels').expect(200))
      .body as ReferentielsApi;

  beforeAll(async () => {
    contexte = await demarrerApplication();
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit');
    adminId = (
      await creerMembre(contexte, {
        pseudo: 'claire-dubois',
        email: 'claire@example.com',
        role: 'ADMINISTRATEUR',
      })
    ).id;
    const ip = ipDeTest();
    const admin = request.agent(contexte.app.getHttpServer());
    await admin
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'claire@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'claire@example.com');
    a = admin.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit');
    await contexte.app.close();
  });

  it('est réservé aux administrateurs', async () => {
    await creerMembre(contexte, { pseudo: 'awa-sarr', email: 'awa.sarr@example.com' });
    const membre = request.agent(contexte.app.getHttpServer());
    const ip = ipDeTest();
    await membre
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await membre.get('/api/v1/admin/categories').expect(403);
    await membre
      .patch('/api/v1/admin/badges/1')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ actif: false })
      .expect(403);
  });

  it('ajoute, modifie et archive une catégorie sans changer son adresse', async () => {
    const saisie = {
      libelle: 'Jeux vidéo',
      icone: 'monitor',
      description: 'Niveaux, personnages, mécaniques : concevoir un jeu jouable avec l’IA.',
    };
    await a
      .post('/api/v1/admin/categories')
      .send({ ...saisie, icone: 'inconnue' })
      .expect(400);
    const creee = (await a.post('/api/v1/admin/categories').send(saisie).expect(201))
      .body as CategorieAdministreeApi;
    expect(creee).toMatchObject({ slug: 'jeux-video', active: true, utilisations: 0 });
    await a.post('/api/v1/admin/categories').send(saisie).expect(409);
    // Une création publiée est classée dans la première catégorie.
    await creerCreation(contexte, adminId);
    const toutes = (await a.get('/api/v1/admin/categories').expect(200))
      .body as CategorieAdministreeApi[];
    expect(toutes.at(-1)?.id).toBe(creee.id);
    expect(toutes[0]?.utilisations).toBe(1);

    const modifiee = (
      await a
        .put(`/api/v1/admin/categories/${creee.id}`)
        .send({ ...saisie, libelle: 'Jeux', icone: 'grid' })
        .expect(200)
    ).body as CategorieAdministreeApi;
    expect(modifiee).toMatchObject({ libelle: 'Jeux', icone: 'grid', slug: 'jeux-video' });
    await a
      .put(`/api/v1/admin/categories/${creee.id}`)
      .send({ ...saisie, libelle: 'Vidéo' })
      .expect(409);
    expect((await publics()).categories.find((c) => c.id === creee.id)?.libelle).toBe('Jeux');

    await a.patch(`/api/v1/admin/categories/${creee.id}`).send({ actif: false }).expect(200);
    expect((await publics()).categories.some((c) => c.id === creee.id)).toBe(false);
    await a.patch('/api/v1/admin/categories/999999').send({ actif: false }).expect(404);

    const journal = await contexte.db
      .select({ action: journalAudit.action })
      .from(journalAudit)
      .where(eq(journalAudit.cibleId, creee.id));
    expect(journal.map((j) => j.action).toSorted()).toEqual([
      'CATEGORIE_ARCHIVEE',
      'CATEGORIE_CREEE',
      'CATEGORIE_MODIFIEE',
    ]);
    await contexte.db.execute(sql`delete from categorie where id = ${creee.id}`);
  });

  it('garde exactement une licence par défaut, toujours proposée (CI-26)', async () => {
    const saisie = {
      code: 'cc-by-nd-4.0',
      libelle: 'CC BY-ND 4.0',
      resume: 'Réutilisation avec mention, sans modification',
      url: 'https://creativecommons.org/licenses/by-nd/4.0/deed.fr',
      autoriseVariantes: false,
    };
    await a
      .post('/api/v1/admin/licences')
      .send({ ...saisie, url: 'http://exemple.fr' })
      .expect(400);
    const creee = (await a.post('/api/v1/admin/licences').send(saisie).expect(201))
      .body as LicenceAdministreeApi;
    expect(creee).toMatchObject({ code: 'CC-BY-ND-4.0', parDefaut: false, active: true });
    await a.post('/api/v1/admin/licences').send(saisie).expect(409);
    await a
      .put(`/api/v1/admin/licences/${creee.id}`)
      .send({ libelle: 'CC BY-ND', resume: saisie.resume, url: '/cgu#licences' })
      .expect(200);

    const initiale = (
      (await a.get('/api/v1/admin/licences').expect(200)).body as LicenceAdministreeApi[]
    ).find((l) => l.parDefaut)!;
    await a.patch(`/api/v1/admin/licences/${initiale.id}`).send({ actif: false }).expect(409);
    const apres = (await a.post(`/api/v1/admin/licences/${creee.id}/defaut`).expect(200))
      .body as LicenceAdministreeApi[];
    expect(apres.filter((l) => l.parDefaut).map((l) => l.id)).toEqual([creee.id]);
    expect((await publics()).licences.find((l) => l.estParDefaut)?.code).toBe('CC-BY-ND-4.0');

    await a.patch(`/api/v1/admin/licences/${initiale.id}`).send({ actif: false }).expect(200);
    await a.post(`/api/v1/admin/licences/${initiale.id}/defaut`).expect(409);
    await a.patch(`/api/v1/admin/licences/${initiale.id}`).send({ actif: true }).expect(200);
    await a.post(`/api/v1/admin/licences/${initiale.id}/defaut`).expect(200);
    await a.patch(`/api/v1/admin/licences/${creee.id}`).send({ actif: false }).expect(200);
    expect((await publics()).licences.some((l) => l.id === creee.id)).toBe(false);
    await contexte.db.delete(licence).where(eq(licence.id, creee.id));
  });

  it('cherche les étiquettes et archive celles qui ne doivent plus être proposées', async () => {
    const liste = async (requete: string) =>
      (await a.get(`/api/v1/admin/etiquettes${requete}`).expect(200))
        .body as ListeEtiquettesAdministreesApi;
    const tout = await liste('');
    expect(tout.total).toBe(tout.proposees + tout.archivees);
    const [premiere] = (await liste('?q=Sécu')).elements;
    expect(premiere?.slug).toContain('secu');

    await a.patch(`/api/v1/admin/etiquettes/${premiere!.id}`).send({ actif: false }).expect(200);
    const archivees = await liste('?etat=archivees');
    expect(archivees.elements.map((e) => e.id)).toContain(premiere!.id);
    expect(archivees.archivees).toBe(tout.archivees + 1);
    await a.patch(`/api/v1/admin/etiquettes/${premiere!.id}`).send({ actif: true }).expect(200);
    await a.get('/api/v1/admin/etiquettes?etat=toutes').expect(400);
  });

  it('arrête l’attribution d’un badge, qui reste affiché chez qui l’a obtenu', async () => {
    const [premiere] = await contexte.db
      .select({ id: badge.id })
      .from(badge)
      .where(eq(badge.code, 'PREMIERE_CREATION'));
    const auteur = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    await creerCreation(contexte, auteur.id);

    const arrete = (
      await a.patch(`/api/v1/admin/badges/${premiere!.id}`).send({ actif: false }).expect(200)
    ).body as BadgeAdministreApi;
    expect(arrete).toMatchObject({ code: 'PREMIERE_CREATION', actif: false, obtentions: 0 });
    await contexte.taches.lancer('badges.attribuer');
    const profil = async () =>
      (await request(contexte.app.getHttpServer()).get('/api/v1/membres/lea-martin').expect(200))
        .body as ProfilApi;
    expect((await profil()).badges.map((b) => b.code)).not.toContain('PREMIERE_CREATION');

    await a.patch(`/api/v1/admin/badges/${premiere!.id}`).send({ actif: true }).expect(200);
    await contexte.taches.lancer('badges.attribuer');
    await a.patch(`/api/v1/admin/badges/${premiere!.id}`).send({ actif: false }).expect(200);
    expect((await profil()).badges.map((b) => b.code)).toContain('PREMIERE_CREATION');
    const badges = (await a.get('/api/v1/admin/badges').expect(200)).body as BadgeAdministreApi[];
    expect(badges.find((b) => b.id === premiere!.id)).toMatchObject({
      actif: false,
      // Léa et l’administratrice, dont la création sert au test des catégories.
      obtentions: 2,
    });
    await a.patch(`/api/v1/admin/badges/${premiere!.id}`).send({ actif: true }).expect(200);
  });
});
