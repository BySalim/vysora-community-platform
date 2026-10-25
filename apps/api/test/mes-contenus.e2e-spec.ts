import type {
  ContenuCreationSaisi,
  CreationFicheApi,
  MaCreationApi,
  MesCreationsApi,
  MesEnregistrementsApi,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  casBonReflexe,
  categorie,
  contenu,
  creation,
  enregistrement,
  message,
  modele,
  outil,
  signalementObsolescence,
  sujet,
} from '../src/db/schema/index.js';
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

type Agent = ReturnType<typeof request.agent>;

describe('Mes contenus (CREA-04, S-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let outilId: number;
  let categorieId: number;
  let modeles: number[];
  let awaId: number;
  let leaId: number;

  async function agentConnecte(email = 'awa.sarr@example.com'): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }
  const envoyer = (
    agent: Agent,
    methode: 'post' | 'put' | 'delete',
    adresse: string,
    corps?: object,
  ) =>
    agent[methode](`/api/v1${adresse}`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send(corps);
  const creer = async (agent: Agent, corps: ContenuCreationSaisi): Promise<number> =>
    ((await envoyer(agent, 'post', '/creations', corps).expect(201)).body as CreationFicheApi).id;
  const mesCreations = async (agent: Agent): Promise<MesCreationsApi> =>
    (await agent.get('/api/v1/moi/creations').expect(200)).body as MesCreationsApi;
  const mesEnregistrements = async (agent: Agent): Promise<MesEnregistrementsApi> =>
    (await agent.get('/api/v1/moi/enregistrements').expect(200)).body as MesEnregistrementsApi;

  const unPrompt = (titre = 'Affiche typographique de Gorée'): ContenuCreationSaisi => ({
    type: 'UN_PROMPT',
    titre,
    objectif: 'Une affiche lisible, construite autour du nom du lieu.',
    categorieId,
    etapes: [
      {
        configurations: [{ outilId, modeleId: modeles[0] }],
        echanges: [
          {
            prompt: 'Affiche typographique de Gorée, bleu profond et blanc.',
            reponse: 'Voici une affiche verticale, le nom du lieu en grand.',
          },
        ],
      },
    ],
  });

  async function creerSujet(auteurId: number): Promise<number> {
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Sujet non créé');
    await contexte.db.insert(sujet).values({
      id: ligne.id,
      typeSujet: 'QUESTION',
      titre: 'Les mains se déforment dans mes plans longs',
      slug: 'les-mains-se-deforment-dans-mes-plans-longs',
      corps: 'Au-delà de cinq secondes, les mains des personnages se déforment.',
      outilId,
      modeleNonReference: 'Version maison',
    });
    for (const statut of ['VISIBLE', 'VISIBLE', 'MASQUE'] as const) {
      const [reponse] = await contexte.db
        .insert(contenu)
        .values({ typeContenu: 'MESSAGE', auteurId: awaId, statut })
        .returning({ id: contenu.id });
      if (reponse)
        await contexte.db
          .insert(message)
          .values({ id: reponse.id, sujetId: ligne.id, corps: 'Essayez des plans plus courts.' });
    }
    return ligne.id;
  }

  async function creerCas(auteurId: number, valide = true): Promise<number> {
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'CAS_BON_REFLEXE', auteurId })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Cas non créé');
    await contexte.db.insert(casBonReflexe).values({
      id: ligne.id,
      titre: 'Un script prêt à lancer ?',
      slug: 'un-script-pret-a-lancer',
      contexte: 'L’IA propose une suppression des doublons fondée sur leur nom.',
      demandeIa: 'Écris un script qui supprime les fichiers en double.',
      reponseIa: 'Ce script supprime tous les fichiers qui portent le même nom.',
      question: 'Que faites-vous ?',
      explication: 'Deux fichiers de même nom peuvent avoir des contenus différents.',
      difficulte: 'INTERMEDIAIRE',
      statutValidation: valide ? 'VALIDE' : 'PROPOSE',
      dateExamen: valide ? new Date() : null,
    });
    return ligne.id;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [premier] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .orderBy(outil.id)
      .limit(1);
    const [cat] = await contexte.db
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.estActive, true))
      .limit(1);
    modeles = (await contexte.db.select({ id: modele.id }).from(modele).limit(2)).map((m) => m.id);
    if (!premier || !cat || modeles.length < 2) throw new Error('Référentiels absents');
    [outilId, categorieId] = [premier.id, cat.id];
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    awaId = (await creerMembre(contexte)).id;
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  it('demande une session ; un compte en lecture seule retrouve ses contenus', async () => {
    for (const adresse of ['/api/v1/moi/creations', '/api/v1/moi/enregistrements']) {
      const refus = await request(serveur()).get(adresse).expect(401);
      expect(refus.body).toMatchObject({ raison: 'connexion' });
    }
    await creerMembre(contexte, {
      pseudo: 'nina-faye',
      email: 'nina@example.com',
      emailVerifie: false,
    });
    const nina = await agentConnecte('nina@example.com');
    expect(await mesCreations(nina)).toEqual({ elements: [], publication: expect.any(Object) });
    expect(await mesEnregistrements(nina)).toEqual({ elements: [] });
  });

  it('liste les brouillons et les créations publiées du membre, jamais celles des autres ni les supprimées (RG-19, RG-30)', async () => {
    const awa = await agentConnecte();
    const vide = await creer(awa, { type: 'UN_PROMPT' });
    const pret = await creer(awa, unPrompt('Brouillon prêt à publier'));
    const publiee = await creer(awa, unPrompt());
    await envoyer(awa, 'post', `/creations/${publiee}/publication`, {
      confirmationDonnees: true,
    }).expect(200);
    const supprimee = await creer(awa, unPrompt('Brouillon supprimé ensuite'));
    await envoyer(awa, 'delete', `/creations/${supprimee}`).expect(204);
    const masquee = await creerCreation(contexte, awaId, { statut: 'MASQUE' });
    await creerCreation(contexte, leaId);

    const { elements } = await mesCreations(awa);
    // Du plus récemment modifié au plus ancien (la création masquée, jamais modifiée, date de sa création).
    expect(elements.map((e) => e.id)).toEqual([masquee, publiee, pret, vide]);
    const parId = (id: number) => elements.find((e) => e.id === id) as MaCreationApi;

    expect(parId(vide)).toMatchObject({
      statut: 'BROUILLON',
      titre: null,
      typeDefini: false,
      outils: [],
      couverture: null,
      apercu: null,
      datePublication: null,
    });
    // Conditions de publication (RG-10 à RG-13), dans l'ordre de l'éditeur.
    expect(parId(vide).conditions).toEqual([
      { libelle: 'Un titre de 10 caractères au moins', remplie: false },
      { libelle: 'L’objectif de la création', remplie: false },
      { libelle: 'Une catégorie', remplie: false },
      { libelle: 'L’outil d’IA utilisé', remplie: false },
      { libelle: 'Le prompt et la réponse ou l’image obtenue', remplie: false },
    ]);
    expect(parId(pret)).toMatchObject({
      typeDefini: true,
      apercu: 'Affiche typographique de Gorée, bleu profond et blanc.',
      categorie: { libelle: expect.any(String), slug: expect.any(String) },
    });
    expect(parId(pret).conditions.every((c) => c.remplie)).toBe(true);
    expect(parId(pret).outils).toEqual([
      { outil: expect.objectContaining({ id: outilId }), modeles: [expect.any(String)] },
    ]);

    expect(parId(publiee)).toMatchObject({
      statut: 'PUBLIEE',
      masquee: false,
      slug: 'affiche-typographique-de-goree',
      conditions: [],
      datePublication: expect.any(String),
    });
    expect(parId(masquee)).toMatchObject({ statut: 'PUBLIEE', masquee: true });
    await (await agentConnecte('lea@example.com')).get('/api/v1/moi/creations').expect(200);
  });

  it('donne les indicateurs de chaque création et les points que sa suppression retirerait (F-33, RG-82)', async () => {
    const awa = await agentConnecte();
    const id = await creer(awa, unPrompt());
    await envoyer(awa, 'post', `/creations/${id}/publication`, {
      confirmationDonnees: true,
    }).expect(200);
    const lea = await agentConnecte('lea@example.com');
    await envoyer(lea, 'put', `/contenus/${id}/votes/UTILE`).expect(200);
    await envoyer(lea, 'post', `/creations/${id}/reproductions`, {
      outilId,
      resultat: 'SUCCES',
    }).expect(201);
    await envoyer(lea, 'post', `/creations/${id}/commentaires`, {
      corps: 'Merci pour le prompt, la typographie tient très bien.',
    }).expect(201);
    await contexte.db.update(contenu).set({ nbVues: 12 }).where(eq(contenu.id, id));
    for (const [membre, modeleId] of [
      [leaId, modeles[1]],
      [awaId, modeles[1]],
      [leaId, modeles[0]],
    ] as const)
      await contexte.db
        .insert(signalementObsolescence)
        .values({ utilisateurId: membre, contenuId: id, modeleId: modeleId! });

    const [element] = (await mesCreations(awa)).elements;
    expect(element?.indicateurs).toEqual({
      utiles: 1,
      reproductions: 1,
      reussies: 1,
      vues: 12,
      commentaires: 1,
    });
    const total = (
      await contexte.db.execute<{ total: number }>(
        sql`select coalesce(sum(points), 0)::int as total from mouvement_reputation where beneficiaire_id = ${awaId}`,
      )
    ).rows[0]?.total;
    expect(total).toBeGreaterThan(0);
    expect(element?.points).toBe(total);
    // F-35 : le modèle le plus signalé, avec le nombre de membres et la date du premier signalement.
    expect(element?.obsolescence).toMatchObject({ membres: 2, depuis: expect.any(String) });

    // Dépubliée, elle redevient un brouillon qui garde sa date de publication (RG-17).
    await envoyer(awa, 'delete', `/creations/${id}/publication`).expect(200);
    const [depubliee] = (await mesCreations(awa)).elements;
    expect(depubliee).toMatchObject({ statut: 'BROUILLON', datePublication: expect.any(String) });
    expect(depubliee?.conditions.every((c) => c.remplie)).toBe(true);
  });

  it('RG-85 : publications des dernières 24 heures et délai avant la suivante', async () => {
    const awa = await agentConnecte();
    expect((await mesCreations(awa)).publication).toEqual({
      limite: 3,
      utilisees: 0,
      reessayerDans: null,
    });
    for (let i = 0; i < 3; i += 1) await creerCreation(contexte, awaId);
    const { publication } = await mesCreations(awa);
    expect(publication).toMatchObject({ limite: 3, utilisees: 3 });
    expect(publication?.reessayerDans).toBeGreaterThan(23 * 3600);
  });

  it('liste les contenus enregistrés visibles de tous, du plus récent au plus ancien (F-34, RG-45)', async () => {
    const creationId = await creerCreation(contexte, leaId);
    const sujetId = await creerSujet(leaId);
    const casId = await creerCas(leaId);
    const depubliee = await creerCreation(contexte, leaId);
    const proposee = await creerCas(leaId, false);
    const lea = await agentConnecte('lea@example.com');
    await envoyer(lea, 'post', `/creations/${creationId}/commentaires`, {
      corps: 'Une précision sur le prompt utilisé.',
    }).expect(201);

    const awa = await agentConnecte();
    for (const id of [creationId, sujetId, casId, depubliee])
      await envoyer(awa, 'put', `/contenus/${id}/enregistrement`).expect(200);
    // Enregistrés avant de quitter la vue de tous : ils restent en base, hors de la liste.
    await contexte.db.insert(enregistrement).values({ utilisateurId: awaId, contenuId: proposee });
    await contexte.db
      .update(creation)
      .set({ statutPublication: 'BROUILLON' })
      .where(eq(creation.id, depubliee));
    // Dates distinctes pour vérifier l'ordre.
    for (const [id, jours] of [
      [creationId, 3],
      [sujetId, 1],
      [casId, 2],
    ] as const)
      await contexte.db.execute(
        sql`update enregistrement set date_enregistrement = now() - make_interval(days => ${jours}) where contenu_id = ${id}`,
      );

    const { elements } = await mesEnregistrements(awa);
    expect(elements.map((e) => [e.genre, e.id])).toEqual([
      ['SUJET', sujetId],
      ['CAS', casId],
      ['CREATION', creationId],
    ]);
    expect(elements[0]).toMatchObject({
      titre: 'Les mains se déforment dans mes plans longs',
      slug: 'les-mains-se-deforment-dans-mes-plans-longs',
      typeSujet: 'QUESTION',
      reponses: 2,
      etat: 'OUVERT',
      outil: { id: outilId },
      modele: 'Version maison',
      auteur: { pseudo: 'lea-martin' },
    });
    expect(elements[1]).toMatchObject({ difficulte: 'INTERMEDIAIRE', auteur: { id: leaId } });
    expect(elements[2]).toMatchObject({
      type: 'UN_PROMPT',
      titre: 'Cité imaginaire entre ciel et mer',
      couverture: null,
      outils: [],
    });

    // Sujet fermé (RG-65), puis retrait de la liste.
    await contexte.db.update(sujet).set({ dateFermeture: new Date() }).where(eq(sujet.id, sujetId));
    expect((await mesEnregistrements(awa)).elements[0]).toMatchObject({ etat: 'FERME' });
    await envoyer(awa, 'delete', `/contenus/${sujetId}/enregistrement`).expect(200);
    expect((await mesEnregistrements(awa)).elements.map((e) => e.id)).toEqual([casId, creationId]);
    expect((await mesEnregistrements(lea)).elements).toEqual([]);
  });
});
