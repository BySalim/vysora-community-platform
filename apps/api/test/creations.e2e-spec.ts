import type { CreationFicheApi, ResultatReproduction, StatutContenu } from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  commentaire,
  configurationIa,
  contenu,
  creation,
  echange,
  enregistrement,
  etape,
  licence,
  lienExterne,
  media,
  momentCle,
  outil,
  reproduction,
  vote,
} from '../src/db/schema/index.js';
import { cleFichier, nouvelIdentifiantFichier } from '../src/modules/medias/stockage.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const HEURE_MS = 60 * 60_000;

describe('Lecture d’une création (CREA-01, F-23, RG-30)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const db = () => contexte.db;

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

  /** Nouveau contenu (table commune). */
  async function nouveauContenu(
    type: 'CREATION' | 'COMMENTAIRE' | 'REPRODUCTION',
    auteurId: number,
    valeurs: { date?: Date; statut?: StatutContenu } = {},
  ): Promise<number> {
    const [ligne] = await db()
      .insert(contenu)
      .values({
        typeContenu: type,
        auteurId,
        dateCreation: valeurs.date ?? new Date(),
        statut: valeurs.statut ?? 'VISIBLE',
      })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Contenu non créé');
    return ligne.id;
  }

  /** Création « 1 prompt » complète : une étape, une configuration, un échange, un moment clé. */
  async function creerCreation(
    auteurId: number,
    options: { publiee?: boolean; statut?: StatutContenu } = {},
  ) {
    const publiee = options.publiee ?? true;
    const id = await nouveauContenu('CREATION', auteurId, { statut: options.statut });
    const [cc] = await db()
      .select({ id: licence.id })
      .from(licence)
      .where(eq(licence.code, 'CC-BY-4.0'));
    await db()
      .insert(creation)
      .values({
        id,
        typeCreation: 'UN_PROMPT',
        titre: 'Cité imaginaire entre ciel et mer',
        slug: 'cite-imaginaire-entre-ciel-et-mer',
        objectif: 'Une cité méditerranéenne en équilibre entre le ciel et la mer.',
        statutPublication: publiee ? 'PUBLIEE' : 'BROUILLON',
        datePublication: publiee ? new Date() : null,
        categorieId: publiee ? 1 : null,
        licenceId: cc?.id ?? 1,
      });
    const [ligneEtape] = await db()
      .insert(etape)
      .values({ creationId: id, ordre: 1 })
      .returning({ id: etape.id });
    const [chatgpt] = await db()
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.nom, 'ChatGPT'));
    const [conf] = await db()
      .insert(configurationIa)
      .values({
        etapeId: ligneEtape!.id,
        outilId: chatgpt!.id,
        modeleNonReference: 'Modèle maison',
      })
      .returning({ id: configurationIa.id });
    const [ech] = await db()
      .insert(echange)
      .values({
        etapeId: ligneEtape!.id,
        configurationId: conf!.id,
        ordre: 1,
        prompt: 'Illustration panoramique d’une cité imaginaire, sans texte.',
        reponse: 'Voici la **cité**.',
        nbEssais: 4,
        modeSelection: 'MEILLEUR_ESSAI',
      })
      .returning({ id: echange.id });
    await db().insert(momentCle).values({
      etapeId: ligneEtape!.id,
      echangeId: ech!.id,
      type: 'DECOUVERTE',
      explication: 'Préciser ce qui attire le regard a équilibré la composition.',
    });
    await db()
      .insert(lienExterne)
      .values({ creationId: id, type: 'DEMO', url: 'https://demo.example' });
    const image = (rattachement: { contenuId: number } | { echangeId: number }) => ({
      televerseurId: auteurId,
      fichier: cleFichier(nouvelIdentifiantFichier(), 1280),
      variantes: {},
      typeMime: 'image/png' as const,
      tailleOctets: 100,
      largeur: 1280,
      hauteur: 960,
      texteAlternatif: 'Cité de tours élancées',
      ...rattachement,
    });
    await db()
      .insert(media)
      .values([image({ contenuId: id }), image({ echangeId: ech!.id })]);
    return { id, outilId: chatgpt!.id };
  }

  async function reproduire(
    creationId: number,
    auteurId: number,
    outilId: number,
    resultat: ResultatReproduction,
    statut: StatutContenu = 'VISIBLE',
    date = new Date(),
  ) {
    const id = await nouveauContenu('REPRODUCTION', auteurId, { statut, date });
    await db()
      .insert(reproduction)
      .values({
        id,
        creationId,
        outilId,
        resultat,
        retour:
          resultat === 'SUCCES' ? null : 'Le rendu change à chaque essai, la composition aussi.',
      });
  }

  async function commenter(
    creationId: number,
    auteurId: number,
    corps: string,
    valeurs: { parentId?: number; statut?: StatutContenu; date?: Date } = {},
  ): Promise<number> {
    const id = await nouveauContenu('COMMENTAIRE', auteurId, valeurs);
    await db().insert(commentaire).values({ id, creationId, corps, parentId: valeurs.parentId });
    return id;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'media');
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'media');
    await contexte.app.close();
  });

  it('présente le résultat obtenu en texte ou en code, au niveau de la création', async () => {
    const auteur = await creerMembre(contexte);
    const { id } = await creerCreation(auteur.id);
    const lire = async () =>
      (
        (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
          .body as CreationFicheApi
      ).resultat;
    expect(await lire()).toBeNull();
    await db()
      .update(creation)
      .set({ resultatTexte: 'print("bonjour")', resultatNature: 'CODE', resultatNom: 'bonjour.py' })
      .where(eq(creation.id, id));
    expect(await lire()).toEqual({ nature: 'CODE', texte: 'print("bonjour")', nom: 'bonjour.py' });
    // Une nature sans texte, ou un nom de fichier sans texte, est refusée par la base.
    await expect(
      db()
        .update(creation)
        .set({ resultatTexte: null, resultatNature: 'TEXTE', resultatNom: null })
        .where(eq(creation.id, id)),
    ).rejects.toThrow();
  });

  it('présente une création publiée à un visiteur : résultat, parcours, preuve', async () => {
    const auteur = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const { id } = await creerCreation(auteur.id);

    const fiche = (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
      .body as CreationFicheApi;
    expect(fiche).toMatchObject({
      id,
      slug: 'cite-imaginaire-entre-ciel-et-mer',
      type: 'UN_PROMPT',
      statut: 'PUBLIEE',
      masquee: false,
      auteur: { pseudo: 'lea-martin', avatar: null, niveau: { code: 'curieux' } },
      licence: { code: 'CC-BY-4.0' },
      liens: [{ type: 'DEMO', url: 'https://demo.example', libelle: null }],
      moi: null,
    });
    // Image du résultat (création) et image jointe à l'échange, chacune à sa place.
    expect(fiche.images).toHaveLength(1);
    const [premiere] = fiche.etapes;
    expect(premiere?.configurations[0]).toMatchObject({
      outil: { nom: 'ChatGPT' },
      modele: null,
      modeleNonReference: 'Modèle maison',
    });
    expect(premiere?.echanges[0]).toMatchObject({
      nbEssais: 4,
      modeSelection: 'MEILLEUR_ESSAI',
      reponse: 'Voici la **cité**.',
    });
    expect(premiere?.echanges[0]?.images).toHaveLength(1);
    expect(premiere?.moments[0]).toMatchObject({
      type: 'DECOUVERTE',
      titre: null,
      echangeId: premiere?.echanges[0]?.id,
    });
    // Sans nom affiché, sans titres, sans format ni liste « À adapter » : le pseudo et les valeurs vides.
    expect(fiche).toMatchObject({
      auteur: { nom: 'lea-martin' },
      formatResultat: null,
      aAdapter: [],
    });
    expect(premiere?.echanges[0]?.titre).toBeNull();
  });

  it('reprend la présentation du prototype : nom affiché, titres, format et « À adapter »', async () => {
    const auteur = await creerMembre(contexte, {
      pseudo: 'lea-martin',
      email: 'lea@example.com',
      nomAffiche: 'Léa Martin',
    });
    const { id } = await creerCreation(auteur.id);
    await db()
      .update(creation)
      .set({
        formatResultat: 'Paysage · 4:3',
        aAdapter: ['La hauteur et la position des tours', 'L’heure et la lumière'],
      })
      .where(eq(creation.id, id));
    await db()
      .update(echange)
      .set({ titre: 'Composer la cité' })
      .where(sql`${echange.etapeId} in (select id from etape where creation_id = ${id})`);
    await db()
      .update(momentCle)
      .set({ titre: 'Donner un point d’ancrage à la composition' })
      .where(sql`${momentCle.etapeId} in (select id from etape where creation_id = ${id})`);

    const fiche = (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
      .body as CreationFicheApi;
    expect(fiche).toMatchObject({
      auteur: { pseudo: 'lea-martin', nom: 'Léa Martin' },
      formatResultat: 'Paysage · 4:3',
      aAdapter: ['La hauteur et la position des tours', 'L’heure et la lumière'],
    });
    expect(fiche.etapes[0]?.echanges[0]?.titre).toBe('Composer la cité');
    expect(fiche.etapes[0]?.moments[0]?.titre).toBe('Donner un point d’ancrage à la composition');
  });

  it('ne montre un brouillon qu’à son auteur, sans commentaires ni reproductions (RG-17)', async () => {
    const auteur = await creerMembre(contexte);
    const autre = await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const { id, outilId } = await creerCreation(auteur.id, { publiee: false });
    await reproduire(id, autre.id, outilId, 'SUCCES');
    await commenter(id, autre.id, 'Un commentaire laissé avant la dépublication.');

    await request(serveur()).get(`/api/v1/creations/${id}`).expect(404);
    await (await agentConnecte('kofi@example.com')).get(`/api/v1/creations/${id}`).expect(404);

    const fiche = (
      await (await agentConnecte('awa.sarr@example.com')).get(`/api/v1/creations/${id}`).expect(200)
    ).body as CreationFicheApi;
    expect(fiche.statut).toBe('BROUILLON');
    expect(fiche.moi).toEqual({ auteur: true, utile: false, enregistree: false });
    expect(fiche.preuve.reproductions.total).toBe(0);
    expect(fiche.commentaires).toEqual({ total: 0, elements: [] });
  });

  it('ne montre une création masquée qu’à son auteur et à la modération ; supprimée, à personne', async () => {
    const auteur = await creerMembre(contexte);
    await creerMembre(contexte, {
      pseudo: 'moderation',
      email: 'moderation@example.com',
      role: 'MODERATEUR',
    });
    const masquee = await creerCreation(auteur.id, { statut: 'MASQUE' });
    const supprimee = await creerCreation(auteur.id, { statut: 'SUPPRIME' });

    await request(serveur()).get(`/api/v1/creations/${masquee.id}`).expect(404);
    const auteurAgent = await agentConnecte('awa.sarr@example.com');
    expect(
      (await auteurAgent.get(`/api/v1/creations/${masquee.id}`).expect(200)).body.masquee,
    ).toBe(true);
    const moderation = await agentConnecte('moderation@example.com');
    await moderation.get(`/api/v1/creations/${masquee.id}`).expect(200);

    await auteurAgent.get(`/api/v1/creations/${supprimee.id}`).expect(404);
    await moderation.get(`/api/v1/creations/${supprimee.id}`).expect(404);
  });

  it('calcule le taux de succès à partir de 3 reproductions visibles (RG-43)', async () => {
    const auteur = await creerMembre(contexte);
    const testeur = await creerMembre(contexte, {
      pseudo: 'kofi-mensah',
      email: 'kofi@example.com',
    });
    const { id, outilId } = await creerCreation(auteur.id);
    const lire = async () =>
      (
        (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
          .body as CreationFicheApi
      ).preuve.reproductions;

    await reproduire(
      id,
      testeur.id,
      outilId,
      'SUCCES',
      'VISIBLE',
      new Date(Date.now() - 2 * HEURE_MS),
    );
    await reproduire(id, testeur.id, outilId, 'ECHEC', 'MASQUE');
    await reproduire(
      id,
      testeur.id,
      outilId,
      'PARTIEL',
      'VISIBLE',
      new Date(Date.now() - HEURE_MS),
    );
    expect(await lire()).toMatchObject({ total: 2, reussies: 1, tauxSucces: null });

    await reproduire(id, testeur.id, outilId, 'SUCCES');
    const reproductions = await lire();
    expect(reproductions).toMatchObject({ total: 3, reussies: 2, tauxSucces: 67 });
    expect(reproductions.parConfiguration).toMatchObject([
      { outil: { nom: 'ChatGPT' }, modele: null, essais: 3, reussis: 2 },
    ]);
    const fiche = (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
      .body as CreationFicheApi;
    // Seuls les essais avec un retour écrit sont détaillés.
    expect(fiche.retours.map((r) => r.resultat)).toEqual(['PARTIEL']);
  });

  it('garde « Commentaire supprimé » seulement s’il a des réponses (RG-51)', async () => {
    const auteur = await creerMembre(contexte);
    const lecteur = await creerMembre(contexte, {
      pseudo: 'kofi-mensah',
      email: 'kofi@example.com',
    });
    const { id } = await creerCreation(auteur.id);
    const t0 = Date.now() - 10 * HEURE_MS;
    const retireAvecReponse = await commenter(id, lecteur.id, 'Question sur le prompt.', {
      statut: 'SUPPRIME',
      date: new Date(t0),
    });
    await commenter(id, auteur.id, 'Réponse de l’autrice.', {
      parentId: retireAvecReponse,
      date: new Date(t0 + HEURE_MS),
    });
    await commenter(id, lecteur.id, 'Commentaire retiré sans réponse.', {
      statut: 'SUPPRIME',
      date: new Date(t0 + 2 * HEURE_MS),
    });
    await commenter(id, lecteur.id, 'Merci pour le détail des essais.', {
      date: new Date(t0 + 3 * HEURE_MS),
    });

    const { commentaires } = (await request(serveur()).get(`/api/v1/creations/${id}`).expect(200))
      .body as CreationFicheApi;
    expect(commentaires.total).toBe(2);
    expect(
      commentaires.elements.map((c) => [c.supprime, c.corps, c.auteur?.pseudo ?? null]),
    ).toEqual([
      [true, null, null],
      [false, 'Réponse de l’autrice.', 'awa-sarr'],
      [false, 'Merci pour le détail des essais.', 'kofi-mensah'],
    ]);
  });

  it('indique au membre connecté son vote « Utile » et son enregistrement', async () => {
    const auteur = await creerMembre(contexte);
    const lecteur = await creerMembre(contexte, {
      pseudo: 'kofi-mensah',
      email: 'kofi@example.com',
    });
    const { id } = await creerCreation(auteur.id);
    await db().insert(vote).values({ votantId: lecteur.id, contenuId: id, typeVoteCode: 'UTILE' });
    await db().insert(enregistrement).values({ utilisateurId: lecteur.id, contenuId: id });

    const fiche = (
      await (await agentConnecte('kofi@example.com')).get(`/api/v1/creations/${id}`).expect(200)
    ).body as CreationFicheApi;
    expect(fiche.moi).toEqual({ auteur: false, utile: true, enregistree: true });
    expect(fiche.preuve.utiles).toBe(1);
  });

  it('répond 404 à un identifiant invalide ou inconnu', async () => {
    for (const id of ['abc', '0', '-3', '99999999', '1.5'])
      await request(serveur()).get(`/api/v1/creations/${id}`).expect(404);
  });
});
