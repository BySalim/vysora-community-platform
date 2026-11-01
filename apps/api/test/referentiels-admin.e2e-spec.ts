import type { EditeurAdministreApi, OutilAdministreApi, ReferentielsApi } from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { editeur, journalAudit } from '../src/db/schema/index.js';
import { semer } from '../src/db/seed/semer.js';
import {
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Référentiel des outils et modèles (ADM-02, F-95, RG-110)', () => {
  let contexte: ApplicationDeTest;
  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await contexte.app.close();
  });

  it('ajoute un outil et un modèle, puis les archive sans les supprimer', async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    const ip = ipDeTest();
    const admin = request.agent(contexte.app.getHttpServer());
    await admin
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'claire@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'claire@example.com');
    const a = admin.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);

    const outil = (
      await a
        .post('/api/v1/admin/outils')
        .send({
          nom: 'Outil Test Studio',
          editeur: 'Éditeur Test',
          type: 'GENERATEUR_IMAGE',
          famille: 'IMAGE',
        })
        .expect(201)
    ).body as OutilAdministreApi;
    expect(outil).toMatchObject({
      slug: 'outil-test-studio',
      editeur: 'Éditeur Test',
      type: 'GENERATEUR_IMAGE',
      famille: 'IMAGE',
      statut: 'ACTIF',
      utilisations: 0,
      modeles: [],
    });
    await a
      .post('/api/v1/admin/outils')
      .send({
        nom: 'Outil Test Studio',
        editeur: 'Éditeur Test',
        type: 'GENERATEUR_IMAGE',
        famille: 'IMAGE',
      })
      .expect(409);
    const avecModele = (
      await a
        .post(`/api/v1/admin/outils/${outil.id}/modeles`)
        .send({ nom: 'Test Image 2', nomCourt: 'Image 2' })
        .expect(201)
    ).body as OutilAdministreApi;
    const modeleId = avecModele.modeles[0]!.id;
    await a
      .post(`/api/v1/admin/outils/${outil.id}/modeles`)
      .send({ nom: 'Test Image 2', nomCourt: 'Image 2' })
      .expect(409);

    const proposes = async () =>
      (
        (await request(contexte.app.getHttpServer()).get('/api/v1/referentiels').expect(200))
          .body as ReferentielsApi
      ).outils.find((o) => o.id === outil.id);
    expect((await proposes())?.modeles.map((m) => m.id)).toEqual([modeleId]);
    await a.patch(`/api/v1/admin/modeles/${modeleId}`).send({ statut: 'RETIRE' }).expect(200);
    expect((await proposes())?.modeles).toEqual([]);
    await a.patch(`/api/v1/admin/outils/${outil.id}`).send({ statut: 'ARCHIVE' }).expect(200);
    expect(await proposes()).toBeUndefined();
    expect(
      ((await a.get('/api/v1/admin/outils').expect(200)).body as OutilAdministreApi[]).find(
        (o) => o.id === outil.id,
      )?.statut,
    ).toBe('ARCHIVE');
    await contexte.db.execute(sql`delete from outil where id = ${outil.id}`);
    await contexte.db.execute(sql`delete from modele where id = ${modeleId}`);
    await contexte.db.execute(sql`delete from editeur where nom = 'Éditeur Test'`);
  });

  it('renomme un éditeur, puis l’archive avec ses outils et ses modèles (RG-110)', async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    const ip = ipDeTest();
    const admin = request.agent(contexte.app.getHttpServer());
    await admin
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email: 'claire@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    await confirmerIdentite(contexte, 'claire@example.com');
    const a = admin.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
    const editeurs = async () =>
      (await a.get('/api/v1/admin/editeurs').expect(200)).body as EditeurAdministreApi[];
    const publics = async () =>
      (await request(contexte.app.getHttpServer()).get('/api/v1/referentiels').expect(200))
        .body as ReferentielsApi;

    const outil = (
      await a
        .post('/api/v1/admin/outils')
        .send({ nom: 'Atelier Test', editeur: 'Studio Test', type: 'AUTRE', famille: 'IMAGE' })
        .expect(201)
    ).body as OutilAdministreApi;
    const modeleId = (
      (
        await a
          .post(`/api/v1/admin/outils/${outil.id}/modeles`)
          .send({ nom: 'Studio Test 1', nomCourt: 'Test 1' })
          .expect(201)
      ).body as OutilAdministreApi
    ).modeles[0]!.id;
    const studio = (await editeurs()).find((e) => e.nom === 'Studio Test')!;
    expect(studio).toMatchObject({
      actif: true,
      outils: [{ id: outil.id, nom: 'Atelier Test', statut: 'ACTIF' }],
      modeles: 1,
      modelesProposes: 1,
    });

    // Renommer : le nouveau nom s'affiche partout ; un nom pris (quelle que soit la casse) est refusé.
    await a.put(`/api/v1/admin/editeurs/${studio.id}`).send({ nom: 'x' }).expect(400);
    const pris = await a.put(`/api/v1/admin/editeurs/${studio.id}`).send({ nom: 'OPENAI' });
    expect(pris.status).toBe(409);
    expect(pris.body.erreurs).toEqual({ nom: 'Un éditeur porte déjà ce nom.' });
    await a
      .put(`/api/v1/admin/editeurs/${studio.id}`)
      .send({ nom: 'Studio Test Renommé' })
      .expect(200);
    expect((await publics()).outils.find((o) => o.id === outil.id)?.editeur).toBe(
      'Studio Test Renommé',
    );
    // L'ancien nom désigne encore l'éditeur (sa clé ne change pas).
    const second = (
      await a
        .post('/api/v1/admin/outils')
        .send({ nom: 'Atelier Test Pro', editeur: 'studio test', type: 'AUTRE', famille: 'IMAGE' })
        .expect(201)
    ).body as OutilAdministreApi;
    expect(second.editeur).toBe('Studio Test Renommé');

    // Un éditeur du référentiel renommé n'est pas recréé au chargement suivant (db:seed).
    const [midjourney] = await contexte.db
      .select()
      .from(editeur)
      .where(eq(editeur.slug, 'midjourney'));
    const comptes = async () =>
      (
        await contexte.db.execute<{ editeurs: number; modeles: number; propositions: number }>(sql`
          select (select count(*) from editeur)::int as editeurs,
            (select count(*) from modele)::int as modeles,
            (select count(*) from outil_modele)::int as propositions`)
      ).rows[0];
    const avant = await comptes();
    await a
      .put(`/api/v1/admin/editeurs/${midjourney!.id}`)
      .send({ nom: 'Midjourney, Inc.' })
      .expect(200);
    await semer(contexte.db);
    expect(await comptes()).toEqual(avant);
    await a.put(`/api/v1/admin/editeurs/${midjourney!.id}`).send({ nom: 'Midjourney' }).expect(200);

    // Archiver : ses outils et modèles ne sont plus proposés, et aucun ne se propose sans lui.
    const archive = (
      await a.patch(`/api/v1/admin/editeurs/${studio.id}`).send({ actif: false }).expect(200)
    ).body as EditeurAdministreApi;
    expect(archive).toMatchObject({ actif: false, modelesProposes: 0 });
    expect(archive.outils.map((o) => o.statut)).toEqual(['ARCHIVE', 'ARCHIVE']);
    const refs = await publics();
    expect(refs.outils.some((o) => o.id === outil.id || o.id === second.id)).toBe(false);
    const refus = await a
      .post('/api/v1/admin/outils')
      .send({
        nom: 'Atelier Test Max',
        editeur: 'Studio Test Renommé',
        type: 'AUTRE',
        famille: 'IMAGE',
      })
      .expect(409);
    expect(refus.body.erreurs.editeur).toContain('est archivé');
    await a.patch(`/api/v1/admin/outils/${outil.id}`).send({ statut: 'ACTIF' }).expect(409);
    await a.patch(`/api/v1/admin/modeles/${modeleId}`).send({ statut: 'DISPONIBLE' }).expect(409);
    await a
      .post(`/api/v1/admin/outils/${outil.id}/modeles`)
      .send({ nom: 'Studio Test 2', nomCourt: 'Test 2' })
      .expect(409);
    const [entree] = await contexte.db
      .select()
      .from(journalAudit)
      .where(eq(journalAudit.action, 'EDITEUR_ARCHIVE'));
    expect(entree).toMatchObject({
      cibleType: 'editeur',
      cibleId: studio.id,
      details: { outils: ['Atelier Test', 'Atelier Test Pro'], modeles: ['Studio Test 1'] },
    });

    // Proposé de nouveau : ses outils restent archivés jusqu'à ce qu'on les propose un par un.
    const repris = (
      await a.patch(`/api/v1/admin/editeurs/${studio.id}`).send({ actif: true }).expect(200)
    ).body as EditeurAdministreApi;
    expect(repris.outils.map((o) => o.statut)).toEqual(['ARCHIVE', 'ARCHIVE']);
    await a.patch(`/api/v1/admin/outils/${outil.id}`).send({ statut: 'ACTIF' }).expect(200);
    expect((await publics()).outils.some((o) => o.id === outil.id)).toBe(true);
    await a.patch('/api/v1/admin/editeurs/999999').send({ actif: false }).expect(404);

    await contexte.db.execute(sql`delete from outil where editeur_id = ${studio.id}`);
    await contexte.db.execute(sql`delete from modele where editeur_id = ${studio.id}`);
    await contexte.db.execute(sql`delete from editeur where id = ${studio.id}`);
  });
});
