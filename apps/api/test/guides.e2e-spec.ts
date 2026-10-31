import type {
  DomainePageApi,
  GuideApi,
  GuidesApi,
  IndexRechercheApi,
  ListeControleApi,
  PropositionPiegeApi,
  RechercheCreationsApi,
  ResultatReproduction,
  SoutienDemandeApi,
  StatutContenu,
  TypeCreation,
} from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  categorie,
  configurationIa,
  contenu,
  creation,
  demandeDroit,
  demandeGuide,
  echange,
  etape,
  guide,
  guideContenu,
  guideEtape,
  guideEtapeSource,
  guidePiege,
  guidePiegeSource,
  licence,
  listeControle,
  modele,
  outil,
  propositionPiege,
  reproduction,
  soutienDemande,
  utilisateur,
  vote,
} from '../src/db/schema/index.js';
import { indexer } from '../src/modules/creations/contenu-creation.js';
import { ExportService } from '../src/modules/membres/export.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = ReturnType<typeof request.agent>;
const JOUR = 24 * 60 * 60_000;

describe('Guides d’Explorer (DEC-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const db = () => contexte.db;
  let awaId: number;
  let membres: number[];
  let claude: { outilId: number; modeleId: number };
  let chatgpt: { outilId: number; modeleId: number };

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent.set('X-Forwarded-For', ip);
  }
  const awa = () => agentConnecte('awa.sarr@example.com');
  const kofi = () => agentConnecte('kofi@example.com');
  const visiteur = () => request.agent(serveur()).set('X-Forwarded-For', ip);

  async function outilEtModele(nomOutil: string, nomModele: string) {
    const [o] = await db().select({ id: outil.id }).from(outil).where(eq(outil.nom, nomOutil));
    const [m] = await db().select({ id: modele.id }).from(modele).where(eq(modele.nom, nomModele));
    if (!o || !m) throw new Error('Référentiels absents');
    return { outilId: o.id, modeleId: m.id };
  }

  /** Création avec une étape, sa configuration et un échange ; publiée et visible par défaut. */
  async function nouvelleCreation(
    titre: string,
    valeurs: {
      type?: TypeCreation;
      publiee?: boolean;
      statut?: StatutContenu;
      configuration?: { outilId: number; modeleId: number };
      date?: Date;
    } = {},
  ): Promise<number> {
    const publiee = valeurs.publiee ?? true;
    const date = valeurs.date ?? new Date(Date.now() - 20 * JOUR);
    const [ligne] = await db()
      .insert(contenu)
      .values({
        typeContenu: 'CREATION',
        auteurId: awaId,
        statut: valeurs.statut ?? 'VISIBLE',
        dateCreation: date,
      })
      .returning({ id: contenu.id });
    const [cc] = await db().select({ id: licence.id }).from(licence).limit(1);
    const [domaine] = await db()
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.slug, 'application-web'));
    if (!ligne || !cc || !domaine) throw new Error('Création non créée');
    await db()
      .insert(creation)
      .values({
        id: ligne.id,
        typeCreation: valeurs.type ?? 'UN_PROMPT',
        titre,
        slug: titre.toLowerCase().replace(/[^a-z]+/g, '-'),
        objectif: 'Permettre aux clientes de choisir un créneau disponible.',
        statutPublication: publiee ? 'PUBLIEE' : 'BROUILLON',
        datePublication: publiee ? date : null,
        categorieId: publiee ? domaine.id : null,
        licenceId: cc.id,
      });
    const [e] = await db()
      .insert(etape)
      .values({ creationId: ligne.id, ordre: 0 })
      .returning({ id: etape.id });
    if (!e) throw new Error('Étape non créée');
    await db()
      .insert(configurationIa)
      .values({ etapeId: e.id, ...(valeurs.configuration ?? claude) });
    await db()
      .insert(echange)
      .values({ etapeId: e.id, ordre: 0, prompt: `Crée une page : ${titre}.` });
    if (publiee) await db().transaction((tx) => indexer(tx, ligne.id));
    return ligne.id;
  }

  async function reproduire(
    creationId: number,
    auteurId: number,
    resultat: ResultatReproduction,
    configuration: { outilId: number; modeleId: number },
    date = new Date(Date.now() - 2 * JOUR),
  ) {
    const [ligne] = await db()
      .insert(contenu)
      .values({ typeContenu: 'REPRODUCTION', auteurId, dateCreation: date })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Reproduction non créée');
    await db()
      .insert(reproduction)
      .values({
        id: ligne.id,
        creationId,
        ...configuration,
        resultat,
        retour: resultat === 'SUCCES' ? null : 'Les créneaux pris restaient sélectionnables.',
      });
  }

  const voterUtile = (contenuId: number, votantId: number, ilYa: number) =>
    db()
      .insert(vote)
      .values({
        votantId,
        contenuId,
        typeVoteCode: 'UTILE',
        dateVote: new Date(Date.now() - ilYa),
      });

  /** Guide de l'équipe, publié par défaut. Les sources désignent des créations. */
  async function nouveauGuide(
    slug: string,
    valeurs: {
      publie?: boolean;
      parcours?: number[];
      etapes?: { titre: string; sources: number[]; citation?: number }[];
      pieges?: { titre: string; sources: number[]; etape?: number }[];
    } = {},
  ) {
    const [domaine] = await db()
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.slug, 'application-web'));
    const [g] = await db()
      .insert(guide)
      .values({
        slug,
        titre: 'Mettre en place la prise de rendez-vous en ligne',
        titreCourt: 'Prise de rendez-vous en ligne',
        categorieId: domaine!.id,
        motsCles: ['réservation', 'rdv'],
        lacunes: ['Aucun parcours ne gère encore le paiement d’un acompte.'],
        datePublication: valeurs.publie === false ? null : new Date(),
      })
      .returning({ id: guide.id });
    if (!g) throw new Error('Guide non créé');
    if (valeurs.parcours?.length)
      await db()
        .insert(guideContenu)
        .values(valeurs.parcours.map((contenuId, ordre) => ({ guideId: g.id, contenuId, ordre })));
    const etapes: number[] = [];
    for (const [ordre, e] of (valeurs.etapes ?? []).entries()) {
      const [ligne] = await db()
        .insert(guideEtape)
        .values({
          guideId: g.id,
          ordre,
          titre: e.titre,
          conseil: 'Plus la description est précise, moins l’IA invente de créneaux.',
          citationCreationId: e.citation ?? null,
          citationTexte: e.citation ? 'Crée une page de réservation.' : null,
        })
        .returning({ id: guideEtape.id });
      etapes.push(ligne!.id);
      if (e.sources.length)
        await db()
          .insert(guideEtapeSource)
          .values(e.sources.map((creationId) => ({ etapeId: ligne!.id, creationId })));
    }
    const pieges: number[] = [];
    for (const [ordre, p] of (valeurs.pieges ?? []).entries()) {
      const [ligne] = await db()
        .insert(guidePiege)
        .values({
          guideId: g.id,
          ordre,
          titre: p.titre,
          solution: 'Vérifiez la disponibilité côté serveur au moment de confirmer.',
          etapeId: p.etape === undefined ? null : etapes[p.etape],
        })
        .returning({ id: guidePiege.id });
      pieges.push(ligne!.id);
      if (p.sources.length)
        await db()
          .insert(guidePiegeSource)
          .values(p.sources.map((creationId) => ({ piegeId: ligne!.id, creationId })));
    }
    return { id: g.id, etapes, pieges };
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    claude = await outilEtModele('Claude', 'Claude Sonnet 4.5');
    chatgpt = await outilEtModele('ChatGPT', 'GPT-5');
  });

  beforeEach(async () => {
    await vider(db(), 'utilisateur', 'guide', 'demande_guide');
    ip = ipDeTest();
    awaId = (await creerMembre(contexte)).id;
    membres = [];
    for (const pseudo of ['kofi', 'lea', 'moussa', 'ndeye'])
      membres.push((await creerMembre(contexte, { pseudo, email: `${pseudo}@example.com` })).id);
  });

  afterAll(async () => {
    await vider(db(), 'utilisateur', 'guide', 'demande_guide');
    await contexte.app.close();
  });

  /** Deux parcours visibles, un brouillon, un masqué ; reproductions et votes de la semaine. */
  async function guideComplet() {
    const salon = await nouvelleCreation('Prise de rendez-vous pour un salon de coiffure');
    const terrain = await nouvelleCreation('Réservation des terrains de football', {
      type: 'ITERATION',
      configuration: chatgpt,
      date: new Date(Date.now() - 3 * JOUR),
    });
    const brouillon = await nouvelleCreation('Agenda du cabinet de kinésithérapie', {
      publiee: false,
    });
    const masquee = await nouvelleCreation('Cours de yoga avec liste d’attente', {
      statut: 'MASQUE',
    });
    const [kofiId, leaId, moussaId, ndeyeId] = membres as [number, number, number, number];
    await reproduire(salon, kofiId, 'SUCCES', chatgpt, new Date(Date.now() - 1 * JOUR));
    await reproduire(salon, leaId, 'SUCCES', claude);
    await reproduire(salon, moussaId, 'SUCCES', claude);
    await reproduire(salon, ndeyeId, 'ECHEC', claude);
    await reproduire(terrain, kofiId, 'SUCCES', chatgpt);
    await reproduire(masquee, kofiId, 'SUCCES', claude);
    await voterUtile(salon, kofiId, 2 * JOUR);
    await voterUtile(salon, leaId, 3 * JOUR);
    await voterUtile(salon, moussaId, 10 * JOUR);
    await voterUtile(terrain, kofiId, 1 * JOUR);
    await voterUtile(masquee, leaId, 1 * JOUR);
    const g = await nouveauGuide('rendez-vous', {
      parcours: [salon, terrain, brouillon, masquee],
      etapes: [
        { titre: 'Décrire les prestations et les horaires', sources: [salon, terrain, brouillon] },
        { titre: 'Refuser un créneau déjà pris', sources: [salon], citation: brouillon },
      ],
      pieges: [
        { titre: 'Des séances qui se chevauchent', sources: [salon, masquee], etape: 0 },
        { titre: 'Deux personnes réservent le même créneau', sources: [salon, terrain], etape: 1 },
      ],
    });
    await nouveauGuide('site-vitrine', { publie: false, parcours: [salon] });
    return { ...g, salon, terrain, brouillon, masquee };
  }

  describe('lecture', () => {
    it('présente les guides publiés, chiffrés sur leurs parcours visibles (RG-30, RG-32, RG-43)', async () => {
      const { salon, terrain, etapes } = await guideComplet();
      const index = (await visiteur().get('/api/v1/guides').expect(200)).body as GuidesApi;
      expect(index.elements.map((g) => g.slug)).toEqual(['rendez-vous']);
      const [g] = index.elements;
      expect(g).toMatchObject({
        titreCourt: 'Prise de rendez-vous en ligne',
        domaine: { slug: 'application-web', icone: 'browser' },
        domaines: ['application-web'],
        parcours: 2,
        // Le brouillon et la création masquée ne comptent pas : 5 reproductions, 4 réussies.
        reproductions: 5,
        tauxReussite: 80,
        // RG-32 : votes « Utile » des 7 derniers jours.
        activite: 3,
        etapes: [
          { id: etapes[0], suivie: 2, piege: true },
          { id: etapes[1], suivie: 1, piege: true },
        ],
        // Le piège rencontré dans le plus de parcours visibles passe en tête.
        piegePrincipal: { titre: 'Deux personnes réservent le même créneau', signale: 2 },
        pieges: 2,
        obsolescence: null,
      });
      expect(g?.auteurs.map((a) => a.pseudo)).toEqual(['awa-sarr']);
      expect(g?.modeles).toEqual([
        { cle: 'GPT-5', outil: 'chatgpt' },
        { cle: 'Claude Sonnet 4.5', outil: 'claude' },
      ]);
      expect(g?.derniereReussite).toMatchObject({ modele: 'GPT-5' });
      expect(g?.texteRecherche).toContain('Réservation des terrains de football');
      expect(index.totaux).toEqual({ parcours: 2, reproductions: 5 });
      expect(index.souventCherches).toEqual(['réservation']);
      expect(index.domaines.map((d) => d.slug)).toContain('application-web');
      expect([salon, terrain].every(Number.isInteger)).toBe(true);
    });

    it('détaille un guide ; un guide en préparation ou inconnu est introuvable', async () => {
      const { salon, terrain } = await guideComplet();
      const g = (await visiteur().get('/api/v1/guides/rendez-vous').expect(200)).body as GuideApi;
      expect(g.parcours.map((p) => p.id)).toEqual([salon, terrain]);
      expect(g.parcours[0]).toMatchObject({
        type: 'UN_PROMPT',
        auteur: { pseudo: 'awa-sarr' },
        outils: [{ outil: { nom: 'Claude' }, modele: 'Sonnet 4.5' }],
        utiles: 3,
        reproductions: { total: 4, reussies: 3, tauxReussite: 75 },
        prompt: 'Crée une page : Prise de rendez-vous pour un salon de coiffure.',
      });
      expect(g.parcours[1]).toMatchObject({
        type: 'ITERATION',
        echanges: 1,
        reproductions: { total: 1, reussies: 1, tauxReussite: null },
      });
      // Sources réduites aux parcours visibles ; la citation d'un brouillon n'est pas montrée.
      expect(g.methode.map((e) => [e.sources, e.citation])).toEqual([
        [[salon, terrain], null],
        [[salon], null],
      ]);
      expect(g.pieges.map((p) => [p.titre, p.sources])).toEqual([
        ['Deux personnes réservent le même créneau', [salon, terrain]],
        ['Des séances qui se chevauchent', [salon]],
      ]);
      expect(g.modeles.map((m) => [m.cle, m.employe, m.reproduit])).toEqual([
        ['GPT-5', [terrain], [salon, terrain]],
        ['Claude Sonnet 4.5', [salon], [salon]],
      ]);
      expect(g.lacunes).toEqual(['Aucun parcours ne gère encore le paiement d’un acompte.']);
      expect(g.autres.map((a) => a.slug)).toEqual(['rendez-vous']);
      expect(g.moi).toBeNull();

      await visiteur().get('/api/v1/guides/site-vitrine').expect(404);
      await visiteur().get('/api/v1/guides/inconnu').expect(404);
      await visiteur().get('/api/v1/guides/Pas%20une%20adresse').expect(404);
    });

    it('cherche les parcours publiés et visibles, avec leur guide (RG-31)', async () => {
      const { salon } = await guideComplet();
      // Un document resté d'une création masquée ne la fait pas apparaître.
      const masquee = await nouvelleCreation('Rendez-vous chez le dentiste', { statut: 'MASQUE' });
      await db().transaction((tx) => indexer(tx, masquee));

      const resultats = (
        await visiteur().get('/api/v1/recherche/creations?q=rendez-vous').expect(200)
      ).body as RechercheCreationsApi;
      expect(resultats.elements).toEqual([
        {
          id: salon,
          slug: expect.any(String),
          type: 'UN_PROMPT',
          titre: 'Prise de rendez-vous pour un salon de coiffure',
          guide: { slug: 'rendez-vous', titreCourt: 'Prise de rendez-vous en ligne' },
        },
      ]);
      const vide = await visiteur().get('/api/v1/recherche/creations?q=').expect(400);
      expect(vide.body.erreurs).toEqual({ q: 'Indiquez ce que vous cherchez.' });

      // Comme le prototype : mots vides écartés, synonymes compris (« rdv » : « rendez-vous »).
      const chercher = async (q: string) =>
        (
          (
            await visiteur()
              .get(`/api/v1/recherche/creations?q=${encodeURIComponent(q)}`)
              .expect(200)
          ).body as RechercheCreationsApi
        ).elements.map((e) => e.id);
      expect(await chercher('rdv')).toEqual([salon]);
      expect(await chercher('Je veux mettre en place la prise de rendez-vous en ligne')).toEqual([
        salon,
      ]);
      expect(await chercher('je veux')).toEqual([]);
    });

    it('donne à la recherche du site les seuls contenus publiés et visibles (S-11)', async () => {
      const { salon, terrain, brouillon, masquee } = await guideComplet();
      const index = (await visiteur().get('/api/v1/recherche/index').expect(200))
        .body as IndexRechercheApi;
      expect(index.creations.map((c) => c.id).toSorted()).toEqual([salon, terrain].toSorted());
      expect(index.creations.map((c) => c.id)).not.toContain(brouillon);
      expect(index.creations.map((c) => c.id)).not.toContain(masquee);
      expect(index.creations.find((c) => c.id === salon)).toMatchObject({
        titre: 'Prise de rendez-vous pour un salon de coiffure',
        domaine: 'Application web',
        outils: [{ nom: 'Claude', modeles: [expect.any(String)] }],
        auteur: { pseudo: expect.any(String) },
        utiles: 3,
        // Création masquée exclue des chiffres : 4 reproductions, 3 réussies (RG-43).
        reproductions: 4,
        tauxReussite: 75,
      });
      // Le guide en préparation n'y figure pas ; ses mots-clés alimentent les recherches fréquentes.
      expect(index.guides.map((g) => g.slug)).toEqual(['rendez-vous']);
      expect(index.guides[0]?.etapes).toEqual([
        'Décrire les prestations et les horaires',
        'Refuser un créneau déjà pris',
      ]);
      expect(index.frequentes).toContain('réservation');
      expect(index.domaines.find((d) => d.slug === 'application-web')?.creations).toBe(2);
      expect(index.membres.map((m) => m.pseudo)).toContain('awa-sarr');
      expect(index.outils.find((o) => o.nom === 'Claude')?.creations).toBe(1);
    });

    it('présente la page d’un domaine avec tous ses parcours publiés et visibles (S-06)', async () => {
      const { salon, terrain, brouillon, masquee } = await guideComplet();
      // Publiée dans le domaine mais présentée par aucun guide : elle figure sur la page.
      const seule = await nouvelleCreation('Formulaire de contact d’une boulangerie');
      const page = (await visiteur().get('/api/v1/domaines/application-web').expect(200))
        .body as DomainePageApi;
      expect(page.domaine.slug).toBe('application-web');
      expect(page.parcours.map((p) => p.id).toSorted()).toEqual([salon, terrain, seule].toSorted());
      expect(page.parcours.map((p) => p.id)).not.toContain(brouillon);
      expect(page.parcours.map((p) => p.id)).not.toContain(masquee);
      expect(page.parcours.find((p) => p.id === salon)?.guide?.slug).toBe('rendez-vous');
      expect(page.parcours.find((p) => p.id === seule)?.guide).toBeNull();
      expect(page.guides.map((g) => g.slug)).toEqual(['rendez-vous']);
      // RG-43 : 5 reproductions des parcours visibles, 4 réussies.
      expect(page.chiffres).toEqual({ reproductions: 5, tauxReussite: 80, auteurs: 1 });
      expect(page.pieges.map((p) => [p.titre, p.signale, p.total])).toEqual([
        ['Deux personnes réservent le même créneau', 2, 2],
        ['Des séances qui se chevauchent', 1, 2],
      ]);
      expect(page.lacunes).toEqual([
        {
          texte: 'Aucun parcours ne gère encore le paiement d’un acompte.',
          guide: { slug: 'rendez-vous', titreCourt: 'Prise de rendez-vous en ligne' },
        },
      ]);
      expect(page.domaines.find((d) => d.slug === 'application-web')?.parcours).toBe(3);
      expect(page.voisins).toHaveLength(3);
      await visiteur().get('/api/v1/domaines/inconnu').expect(404);
    });

    it('relie la fiche d’une création à son guide publié (fil d’Ariane, retour)', async () => {
      const { id, salon, brouillon } = await guideComplet();
      const fiche = (await visiteur().get(`/api/v1/creations/${salon}`).expect(200)).body as {
        guide: unknown;
      };
      expect(fiche.guide).toEqual({
        slug: 'rendez-vous',
        titre: 'Mettre en place la prise de rendez-vous en ligne',
        titreCourt: 'Prise de rendez-vous en ligne',
      });
      // Le guide en préparation (site-vitrine) n'est pas proposé ; un brouillon n'a pas de guide.
      await db()
        .delete(guideContenu)
        .where(and(eq(guideContenu.contenuId, salon), eq(guideContenu.guideId, id)));
      const seule = (await visiteur().get(`/api/v1/creations/${salon}`).expect(200)).body as {
        guide: unknown;
      };
      expect(seule.guide).toBeNull();
      const parAwa = (await (await awa()).get(`/api/v1/creations/${brouillon}`).expect(200))
        .body as { guide: unknown };
      expect(parAwa.guide).toBeNull();
    });
  });

  describe('liste de contrôle', () => {
    it('est enregistrée dans le compte, réduite aux étapes et pièges du guide', async () => {
      const { etapes, pieges } = await guideComplet();
      const autre = await nouveauGuide('autre', {
        etapes: [{ titre: 'Une étape d’un autre guide', sources: [] }],
      });
      await visiteur()
        .put('/api/v1/guides/rendez-vous/liste')
        .set('Origin', ORIGINE_SITE)
        .send({ etapes: [], pieges: [] })
        .expect(401);

      const agent = await awa();
      const enregistree = (
        await agent
          .put('/api/v1/guides/rendez-vous/liste')
          .set('Origin', ORIGINE_SITE)
          .send({ etapes: [etapes[1], autre.etapes[0]], pieges: [pieges[0]] })
          .expect(200)
      ).body as ListeControleApi;
      expect(enregistree).toEqual({ etapes: [etapes[1]], pieges: [pieges[0]] });
      const g = (await agent.get('/api/v1/guides/rendez-vous').expect(200)).body as GuideApi;
      expect(g.moi?.liste).toEqual(enregistree);

      await agent
        .put('/api/v1/guides/rendez-vous/liste')
        .set('Origin', ORIGINE_SITE)
        .send({ etapes: [], pieges: [] })
        .expect(200);
      const relu = (await agent.get('/api/v1/guides/rendez-vous').expect(200)).body as GuideApi;
      expect(relu.moi?.liste).toEqual({ etapes: [], pieges: [] });
      await agent
        .put('/api/v1/guides/site-vitrine/liste')
        .set('Origin', ORIGINE_SITE)
        .send({ etapes: [], pieges: [] })
        .expect(404);
    });
  });

  describe('pièges signalés', () => {
    it('sont relus avant de rejoindre le guide ; le membre voit les siens en relecture', async () => {
      const { etapes } = await guideComplet();
      const autre = await nouveauGuide('autre', {
        etapes: [{ titre: 'Une étape d’un autre guide', sources: [] }],
      });
      const signaler = (agent: Agent, corps: object) =>
        agent
          .post('/api/v1/guides/rendez-vous/propositions')
          .set('Origin', ORIGINE_SITE)
          .send(corps);

      await signaler(visiteur(), { titre: 'Les créneaux pris restaient réservables.' }).expect(401);
      const agent = await awa();
      const court = await signaler(agent, { titre: 'Trop court' }).expect(400);
      expect(court.body.erreurs).toEqual({
        titre: 'Décrivez le piège en une phrase d’au moins 15 caractères.',
      });
      const ailleurs = await signaler(agent, {
        titre: 'Les créneaux pris restaient réservables.',
        etapeId: autre.etapes[0],
      }).expect(400);
      expect(ailleurs.body.erreurs).toEqual({ etapeId: 'Choisissez une étape de ce guide.' });

      const proposition = (
        await signaler(agent, {
          titre: 'Les créneaux pris restaient réservables depuis un autre onglet.',
          solution: 'Vérifier la disponibilité au moment de confirmer.',
          etapeId: etapes[1],
          outil: 'Claude Sonnet 4.5',
        }).expect(201)
      ).body as PropositionPiegeApi;
      expect(proposition).toMatchObject({
        // Le point final est retiré, comme dans le prototype.
        titre: 'Les créneaux pris restaient réservables depuis un autre onglet',
        etapeId: etapes[1],
        statut: 'EN_RELECTURE',
      });

      const vu = (await agent.get('/api/v1/guides/rendez-vous').expect(200)).body as GuideApi;
      expect(vu.moi?.propositions.map((p) => p.id)).toEqual([proposition.id]);
      expect(vu.pieges).toHaveLength(2);
      const parKofi = (await (await kofi()).get('/api/v1/guides/rendez-vous').expect(200))
        .body as GuideApi;
      expect(parKofi.moi?.propositions).toEqual([]);
    });

    it('sont limités à 20 en attente de relecture par membre', async () => {
      const { id } = await guideComplet();
      await db()
        .insert(propositionPiege)
        .values(
          Array.from({ length: 19 }, (_, i) => ({
            guideId: id,
            auteurId: awaId,
            titre: `Un piège rencontré numéro ${i + 1}`,
          })),
        );
      const agent = await awa();
      const signaler = () =>
        agent
          .post('/api/v1/guides/rendez-vous/propositions')
          .set('Origin', ORIGINE_SITE)
          .send({ titre: 'Les créneaux pris restaient réservables.' });
      await signaler().expect(201);
      const refus = await signaler().expect(429);
      expect(refus.body.detail).toBe(
        'Vous avez 20 pièges en relecture. Attendez que l’équipe les ait relus pour en signaler d’autres.',
      );
    });
  });

  describe('ce que la communauté cherche encore', () => {
    it('compte « Je le cherche aussi » sur 30 jours, demandes ouvertes seulement', async () => {
      const [ouverte, close] = await db()
        .insert(demandeGuide)
        .values([
          { libelle: 'Podcast en wolof' },
          { libelle: 'Menu de restaurant en plusieurs langues', dateCloture: new Date() },
        ])
        .returning({ id: demandeGuide.id });
      const [kofiId, leaId] = membres as [number, number];
      await db()
        .insert(soutienDemande)
        .values([
          { demandeId: ouverte!.id, utilisateurId: kofiId, date: new Date(Date.now() - 2 * JOUR) },
          // Plus de 30 jours : ne compte plus.
          { demandeId: ouverte!.id, utilisateurId: leaId, date: new Date(Date.now() - 40 * JOUR) },
        ]);
      const index = (await visiteur().get('/api/v1/guides').expect(200)).body as GuidesApi;
      expect(index.demandes).toEqual([
        {
          id: ouverte!.id,
          libelle: 'Podcast en wolof',
          domaine: null,
          soutiens: 1,
          soutenue: false,
        },
      ]);

      const soutenir = (agent: Agent, id: number) =>
        agent.put(`/api/v1/demandes/${id}/soutien`).set('Origin', ORIGINE_SITE);
      await soutenir(visiteur(), ouverte!.id).expect(401);
      const agent = await awa();
      const reponse = (await soutenir(agent, ouverte!.id).expect(200)).body as SoutienDemandeApi;
      expect(reponse).toEqual({ id: ouverte!.id, soutiens: 2, soutenue: true });
      expect((await soutenir(agent, ouverte!.id).expect(200)).body.soutiens).toBe(2);
      const vu = (await agent.get('/api/v1/guides').expect(200)).body as GuidesApi;
      expect(vu.demandes[0]?.soutenue).toBe(true);

      const retrait = await agent
        .delete(`/api/v1/demandes/${ouverte!.id}/soutien`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(retrait.body).toEqual({ id: ouverte!.id, soutiens: 1, soutenue: false });
      await soutenir(agent, close!.id).expect(404);
      await soutenir(agent, 999_999).expect(404);
    });
  });

  describe('données personnelles', () => {
    async function traces() {
      const { id, etapes } = await guideComplet();
      const [demande] = await db()
        .insert(demandeGuide)
        .values({ libelle: 'Podcast en wolof' })
        .returning({ id: demandeGuide.id });
      await db().insert(soutienDemande).values({ demandeId: demande!.id, utilisateurId: awaId });
      await db().insert(propositionPiege).values({
        guideId: id,
        auteurId: awaId,
        titre: 'Les créneaux pris restaient réservables',
        outil: 'Claude Sonnet 4.5',
      });
      await db()
        .insert(listeControle)
        .values({ utilisateurId: awaId, guideId: id, etapes: [etapes[0]!], pieges: [] });
    }

    it('figurent dans l’export (F-07)', async () => {
      await traces();
      const donnees = (await contexte.app.get(ExportService).composer(awaId)) as {
        explorer: unknown;
      };
      expect(donnees.explorer).toEqual({
        listes_de_controle: [
          {
            guide: 'rendez-vous',
            etapes_cochees: ['Décrire les prestations et les horaires'],
            pieges_evites: [],
            modifiee_le: expect.any(String),
          },
        ],
        pieges_signales: [
          {
            guide: 'rendez-vous',
            piege: 'Les créneaux pris restaient réservables',
            ce_qui_a_fonctionne: null,
            outil: 'Claude Sonnet 4.5',
            statut: 'EN_RELECTURE',
            date: expect.any(String),
          },
        ],
        objectifs_cherches: [{ objectif: 'Podcast en wolof', date: expect.any(String) }],
      });
      const parametres = await (await awa()).get('/api/v1/moi/parametres').expect(200);
      expect(parametres.body.export.contenu.explorer).toBe(3);
    });

    it('sont effacées avec le compte (F-08)', async () => {
      await traces();
      await db()
        .update(utilisateur)
        .set({ statutCompte: 'EN_SUPPRESSION' })
        .where(eq(utilisateur.id, awaId));
      await db()
        .insert(demandeDroit)
        .values({
          utilisateurId: awaId,
          type: 'SUPPRESSION',
          suppressionCreations: false,
          dateDemande: new Date(Date.now() - 31 * JOUR),
        });
      await contexte.taches.lancer('comptes.supprimer');
      const restes = await Promise.all([
        db().$count(listeControle, eq(listeControle.utilisateurId, awaId)),
        db().$count(propositionPiege, eq(propositionPiege.auteurId, awaId)),
        db().$count(soutienDemande, eq(soutienDemande.utilisateurId, awaId)),
      ]);
      expect(restes).toEqual([0, 0, 0]);
    });
  });
});
