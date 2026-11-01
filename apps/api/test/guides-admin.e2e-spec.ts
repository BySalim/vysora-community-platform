import type {
  DemandesAdministreesApi,
  GuideAdministreApi,
  GuideApi,
  GuidesAdministresApi,
  GuidesApi,
  JournalAuditApi,
  PropositionsPiegeApi,
  SaisieGuide,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import {
  casBonReflexe,
  categorie,
  contenu,
  guideContenu,
  guideContenuRetire,
  listeControle,
  optionReponse,
  propositionPiege,
  sujet,
} from '../src/db/schema/index.js';
import { rattacherAuGuide } from '../src/modules/decouverte/rattachement.js';
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

type Agent = InstanceType<typeof TestAgent>;
const TABLES = ['utilisateur', 'contenu', 'guide', 'demande_guide', 'journal_audit'];

describe('Administration des guides d’Explorer (DEC-02)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let domaine: number;
  let awaId: number;
  const serveur = () => contexte.app.getHttpServer();
  const db = () => contexte.db;

  async function agentConnecte(email: string, confirme = true): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    if (confirme) await confirmerIdentite(contexte, email);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const admin = () => agentConnecte('claire@example.com');

  async function nouveauSujet(titre: string, statut: 'VISIBLE' | 'MASQUE' = 'VISIBLE') {
    const [ligne] = await db()
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId: awaId, statut })
      .returning({ id: contenu.id });
    await db().insert(sujet).values({
      id: ligne!.id,
      typeSujet: 'QUESTION',
      titre,
      slug: 'question',
      corps: 'Comment empêcher deux réservations sur le même créneau ?',
    });
    return ligne!.id;
  }

  async function nouveauCas(statutValidation: 'VALIDE' | 'PROPOSE' = 'VALIDE') {
    const [ligne] = await db()
      .insert(contenu)
      .values({ typeContenu: 'CAS_BON_REFLEXE', auteurId: awaId })
      .returning({ id: contenu.id });
    await db()
      .insert(casBonReflexe)
      .values({
        id: ligne!.id,
        titre: 'Le créneau réservé deux fois',
        slug: 'creneau-reserve-deux-fois',
        contexte: 'L’IA propose un formulaire de réservation sans contrôle des doublons.',
        demandeIa: 'Écris le formulaire de réservation.',
        reponseIa: 'Voici un formulaire qui enregistre chaque demande.',
        question: 'Que vérifiez-vous ?',
        explication: 'Deux personnes peuvent réserver le même créneau au même moment.',
        difficulte: 'INTERMEDIAIRE',
        statutValidation,
        dateExamen: statutValidation === 'VALIDE' ? new Date() : null,
      });
    await db()
      .insert(optionReponse)
      .values([
        { casId: ligne!.id, ordre: 0, libelle: 'Publier le formulaire', explication: 'Risqué.' },
        {
          casId: ligne!.id,
          ordre: 1,
          libelle: 'Bloquer le créneau à la réservation',
          estCorrecte: true,
          explication: 'Le créneau ne peut plus être pris deux fois.',
        },
      ]);
    return ligne!.id;
  }

  /** Guide créé par l'API, en préparation. */
  async function nouveauGuide(agent: Agent, slug = 'cite-imaginaire') {
    return (
      await agent
        .post('/api/v1/admin/guides')
        .send({
          titre: 'Imaginer une cité entre ciel et mer',
          titreCourt: 'Cités imaginaires',
          slug,
          categorieId: domaine,
        })
        .expect(201)
    ).body as GuideAdministreApi;
  }

  /** Saisie complète d'un guide lu, à modifier. */
  const saisieDe = (g: GuideAdministreApi): SaisieGuide => ({
    version: g.version,
    titre: g.titre,
    titreCourt: g.titreCourt,
    categorieId: g.categorieId,
    motsCles: g.motsCles,
    lacunes: g.lacunes,
    etapes: g.etapes.map((e) => ({ ...e })),
    pieges: g.pieges.map(({ etapeId, ...p }) => ({
      ...p,
      etape: etapeId === null ? null : g.etapes.findIndex((e) => e.id === etapeId),
    })),
  });

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [cat] = await db()
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.estActive, true))
      .limit(1);
    domaine = cat!.id;
  });
  beforeEach(async () => {
    ip = ipDeTest();
    await vider(db(), ...TABLES);
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    awaId = (await creerMembre(contexte)).id;
  });
  afterAll(async () => {
    await vider(db(), ...TABLES);
    await contexte.app.close();
  });

  it('est réservée aux administrateurs dont l’identité est confirmée', async () => {
    const membre = await agentConnecte('awa.sarr@example.com');
    await membre.get('/api/v1/admin/guides').expect(403);
    await membre.get('/api/v1/admin/propositions-pieges').expect(403);
    await membre.get('/api/v1/admin/demandes').expect(403);
    const nonConfirme = await agentConnecte('claire@example.com', false);
    await nonConfirme.get('/api/v1/admin/guides').expect(403);
  });

  it('rédige, range des contenus, publie et repasse en préparation un guide', async () => {
    const agent = await admin();
    const refus = await agent
      .post('/api/v1/admin/guides')
      .send({ titre: 'Court', titreCourt: '', slug: 'Cité ciel', categorieId: domaine })
      .expect(400);
    expect(refus.body.erreurs).toMatchObject({
      titre: 'L’objectif compte au moins 10 caractères.',
      titreCourt: 'Indiquez le nom court du guide.',
      slug: 'L’adresse ne contient que des lettres minuscules sans accent, des chiffres et des tirets.',
    });

    const cree = await nouveauGuide(agent);
    expect(cree).toMatchObject({ datePublication: null, etapes: [], contenus: [] });
    expect(cree.supprimable).toBe(true);
    const doublon = await agent
      .post('/api/v1/admin/guides')
      .send({
        titre: 'Un autre objectif',
        titreCourt: 'Autre',
        slug: 'cite-imaginaire',
        categorieId: domaine,
      })
      .expect(400);
    expect(doublon.body.erreurs.slug).toBe('Cette adresse est déjà celle d’un autre guide.');

    // Contenus : un parcours publié et visible, une question, un cas validé.
    const parcours = await creerCreation(contexte, awaId);
    const autreParcours = await creerCreation(contexte, awaId);
    const brouillon = await creerCreation(contexte, awaId, { publiee: false });
    const masque = await nouveauSujet('Question masquée', 'MASQUE');
    const question = await nouveauSujet('Comment éviter les doublons ?');
    const cas = await nouveauCas();
    const casPropose = await nouveauCas('PROPOSE');
    for (const contenuId of [parcours, autreParcours, question, cas])
      await agent.post(`/api/v1/admin/guides/${cree.id}/contenus`).send({ contenuId }).expect(201);
    for (const [contenuId, message] of [
      [
        brouillon,
        'Ce contenu n’est pas publié ou n’est pas visible : il ne peut pas rejoindre un guide.',
      ],
      [
        masque,
        'Ce contenu n’est pas publié ou n’est pas visible : il ne peut pas rejoindre un guide.',
      ],
      [
        casPropose,
        'Ce cas n’est pas validé ou n’est pas visible : il ne peut pas rejoindre un guide.',
      ],
      [parcours, 'Ce contenu fait déjà partie du guide.'],
      [999_999, 'Indiquez une création, une question du forum ou un cas Bon réflexe.'],
    ] as const) {
      const r = await agent
        .post(`/api/v1/admin/guides/${cree.id}/contenus`)
        .send({ contenuId })
        .expect(400);
      expect(r.body.erreurs.contenuId).toBe(message);
    }
    // Un parcours n'appartient qu'à un guide.
    const autreGuide = await nouveauGuide(agent, 'autre-guide');
    const ailleurs = await agent
      .post(`/api/v1/admin/guides/${autreGuide.id}/contenus`)
      .send({ contenuId: parcours })
      .expect(400);
    expect(ailleurs.body.erreurs.contenuId).toBe(
      'Ce parcours fait partie du guide « Cités imaginaires ». Retirez-le d’abord de ce guide.',
    );

    // Rédaction : méthode, piège à l'étape ajoutée, discussion et cas du guide.
    const lu = (await agent.get(`/api/v1/admin/guides/${cree.id}`).expect(200))
      .body as GuideAdministreApi;
    expect(lu.contenus.map((c) => [c.id, c.type, c.presente])).toEqual([
      [parcours, 'CREATION', true],
      [autreParcours, 'CREATION', true],
      [question, 'SUJET', true],
      [cas, 'CAS_BON_REFLEXE', true],
    ]);
    const saisie: SaisieGuide = {
      ...saisieDe(lu),
      motsCles: ['cité', 'Cité', 'imaginaire'],
      lacunes: ['Les cités sous-marines'],
      etapes: [
        {
          id: null,
          titre: 'Décrire la cité',
          conseil: 'Plus la description est précise, moins l’IA invente.',
          sources: [parcours, autreParcours],
          citation: { parcoursId: parcours, texte: 'Une cité entre ciel et mer, vue du large.' },
        },
        {
          id: null,
          titre: 'Choisir la lumière',
          conseil: 'Une seule source de lumière donne une image cohérente.',
          sources: [parcours],
          citation: null,
        },
      ],
      pieges: [
        {
          id: null,
          titre: 'La mer change de couleur d’une image à l’autre',
          solution: 'Donner la couleur exacte de la mer dans chaque prompt.',
          etape: 1,
          sources: [autreParcours],
          sujetId: question,
          casId: cas,
        },
      ],
    };
    const invalide = await agent
      .put(`/api/v1/admin/guides/${cree.id}`)
      .send({
        ...saisie,
        etapes: [{ ...saisie.etapes[0]!, sources: [brouillon] }],
        pieges: [{ ...saisie.pieges[0]!, etape: 0, sujetId: masque }],
      })
      .expect(400);
    expect(invalide.body.erreurs).toEqual({
      'etapes.0.sources': 'Choisissez des parcours de ce guide.',
      'pieges.0.sujetId': 'Choisissez une question de ce guide.',
    });
    const redige = (await agent.put(`/api/v1/admin/guides/${cree.id}`).send(saisie).expect(200))
      .body as GuideAdministreApi;
    expect(redige.motsCles).toEqual(['cité', 'imaginaire']);
    const [decrire, lumiere] = redige.etapes;
    expect(redige.pieges).toEqual([
      expect.objectContaining({ etapeId: lumiere!.id, sujetId: question, casId: cas }),
    ]);
    // Une version périmée n'écrase pas la modification d'un autre administrateur.
    const perime = await agent.put(`/api/v1/admin/guides/${cree.id}`).send(saisie).expect(409);
    expect(perime.body.detail).toMatch(/modifié entre-temps/);

    // Réordonner et retirer : les étapes gardées conservent leur identifiant.
    const reordonne = (
      await agent
        .put(`/api/v1/admin/guides/${cree.id}`)
        .send({
          ...saisieDe(redige),
          etapes: [saisieDe(redige).etapes[1]!],
          pieges: saisieDe(redige).pieges.map((p) => ({ ...p, etape: 0 })),
        })
        .expect(200)
    ).body as GuideAdministreApi;
    expect(reordonne.etapes.map((e) => e.id)).toEqual([lumiere!.id]);
    expect(reordonne.etapes.map((e) => e.id)).not.toContain(decrire!.id);

    // Publication : le guide apparaît dans Explorer.
    await agent.post(`/api/v1/admin/guides/${autreGuide.id}/publication`).expect(409);
    const publie = (await agent.post(`/api/v1/admin/guides/${cree.id}/publication`).expect(200))
      .body as GuideAdministreApi;
    expect(publie.datePublication).not.toBeNull();
    expect(publie.supprimable).toBe(false);
    const explorer = (await request(serveur()).get('/api/v1/guides/cite-imaginaire').expect(200))
      .body as GuideApi;
    expect(explorer.methode.map((e) => e.titre)).toEqual(['Choisir la lumière']);
    expect(explorer.lacunes).toEqual(['Les cités sous-marines']);
    // Un guide publié garde une étape au moins.
    const vide = await agent
      .put(`/api/v1/admin/guides/${cree.id}`)
      .send({ ...saisieDe(publie), etapes: [], pieges: [] })
      .expect(400);
    expect(vide.body.erreurs.etapes).toBe(
      'Un guide publié garde au moins une étape dans sa méthode.',
    );
    await agent.delete(`/api/v1/admin/guides/${cree.id}`).expect(409);

    const liste = (await agent.get('/api/v1/admin/guides').expect(200))
      .body as GuidesAdministresApi;
    expect(liste.elements.map((g) => [g.slug, g.datePublication !== null, g.parcours])).toEqual([
      ['autre-guide', false, 0],
      ['cite-imaginaire', true, 2],
    ]);

    await agent.delete(`/api/v1/admin/guides/${cree.id}/publication`).expect(200);
    await request(serveur()).get('/api/v1/guides/cite-imaginaire').expect(404);
    await agent.delete(`/api/v1/admin/guides/${cree.id}/publication`).expect(409);
  });

  it('retire un parcours mal rangé : le rapprochement ne le remet plus dans ce guide', async () => {
    const agent = await admin();
    const g = await nouveauGuide(agent);
    const range = await creerCreation(contexte, awaId);
    await agent
      .post(`/api/v1/admin/guides/${g.id}/contenus`)
      .send({ contenuId: range })
      .expect(201);
    const lu = (await agent.get(`/api/v1/admin/guides/${g.id}`)).body as GuideAdministreApi;
    const redige = (
      await agent
        .put(`/api/v1/admin/guides/${g.id}`)
        .send({
          ...saisieDe(lu),
          motsCles: ['cité', 'imaginaire'],
          etapes: [
            {
              id: null,
              titre: 'Décrire la cité',
              conseil: 'Plus la description est précise, moins l’IA invente.',
              sources: [range],
              citation: { parcoursId: range, texte: 'Une cité entre ciel et mer.' },
            },
          ],
          pieges: [
            {
              id: null,
              titre: 'La mer change de couleur',
              solution: 'Donner la couleur exacte de la mer.',
              etape: 0,
              sources: [range],
              sujetId: null,
              casId: null,
            },
          ],
        })
        .expect(200)
    ).body as GuideAdministreApi;
    await agent.post(`/api/v1/admin/guides/${g.id}/publication`).expect(200);

    // Une création proche rejoint ce guide par le rapprochement…
    const proche = await creerCreation(contexte, awaId);
    expect(await rattacherAuGuide(db(), proche)).toBe(g.id);

    // …sauf celle que l'équipe en a retirée.
    const apres = (await agent.delete(`/api/v1/admin/guides/${g.id}/contenus/${range}`).expect(200))
      .body as GuideAdministreApi;
    expect(apres.contenus.map((c) => c.id)).toEqual([proche]);
    expect(apres.retires.map((c) => c.id)).toEqual([range]);
    expect(apres.etapes[0]).toMatchObject({ sources: [], citation: null });
    expect(apres.pieges[0]!.sources).toEqual([]);
    expect(apres.version).not.toBe(redige.version);
    expect(await rattacherAuGuide(db(), range)).toBeNull();
    expect(await db().select().from(guideContenu).where(eq(guideContenu.contenuId, range))).toEqual(
      [],
    );
    await agent.delete(`/api/v1/admin/guides/${g.id}/contenus/${range}`).expect(404);

    // Remis à la main, il quitte la liste des retirés.
    await agent
      .post(`/api/v1/admin/guides/${g.id}/contenus`)
      .send({ contenuId: range })
      .expect(201);
    expect(
      await db().select().from(guideContenuRetire).where(eq(guideContenuRetire.guideId, g.id)),
    ).toEqual([]);
  });

  it('supprime un guide en préparation que personne n’a utilisé', async () => {
    const agent = await admin();
    const g = await nouveauGuide(agent);
    const utilise = await nouveauGuide(agent, 'guide-utilise');
    await db().insert(listeControle).values({ utilisateurId: awaId, guideId: utilise.id });
    expect(
      (await agent.get(`/api/v1/admin/guides/${utilise.id}`)).body.supprimable as boolean,
    ).toBe(false);
    const refus = await agent.delete(`/api/v1/admin/guides/${utilise.id}`).expect(409);
    expect(refus.body.detail).toMatch(/ne se supprime plus/);
    await agent.delete(`/api/v1/admin/guides/${g.id}`).expect(204);
    await agent.get(`/api/v1/admin/guides/${g.id}`).expect(404);

    const journal = (await agent.get('/api/v1/admin/journal?domaine=guides').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.map((e) => [e.action, e.cible?.nom ?? e.details?.nom])).toEqual([
      ['GUIDE_SUPPRIME', 'Cités imaginaires'],
      ['GUIDE_CREE', 'Cités imaginaires'],
      ['GUIDE_CREE', 'Cités imaginaires'],
    ]);
  });

  it('relit les pièges signalés : retenu et écrit dans le guide, ou écarté', async () => {
    const agent = await admin();
    const g = await nouveauGuide(agent);
    const lu = (await agent.get(`/api/v1/admin/guides/${g.id}`)).body as GuideAdministreApi;
    const redige = (
      await agent
        .put(`/api/v1/admin/guides/${g.id}`)
        .send({
          ...saisieDe(lu),
          etapes: [
            {
              id: null,
              titre: 'Décrire la cité',
              conseil: 'Plus la description est précise, moins l’IA invente.',
              sources: [],
              citation: null,
            },
          ],
        })
        .expect(200)
    ).body as GuideAdministreApi;
    await agent.post(`/api/v1/admin/guides/${g.id}/publication`).expect(200);
    const etapeId = redige.etapes[0]!.id;

    const membre = await agentConnecte('awa.sarr@example.com');
    for (const titre of [
      'La mer change de couleur d’une image à l’autre',
      'Les bâtiments flottent au-dessus de l’eau',
    ])
      await membre
        .post('/api/v1/guides/cite-imaginaire/propositions')
        .send({ titre, solution: 'Préciser la couleur dans chaque prompt.', etapeId, outil: null })
        .expect(201);

    const relire = (await agent.get('/api/v1/admin/propositions-pieges').expect(200))
      .body as PropositionsPiegeApi;
    expect(relire.total).toBe(2);
    const [premier, second] = relire.elements;
    expect(premier).toMatchObject({
      titre: 'La mer change de couleur d’une image à l’autre',
      auteur: { pseudo: 'awa-sarr' },
      guide: { slug: 'cite-imaginaire', titreCourt: 'Cités imaginaires', publie: true },
      etapes: [{ id: etapeId, titre: 'Décrire la cité' }],
    });

    const refus = await agent
      .post(`/api/v1/admin/propositions-pieges/${premier!.id}/relecture`)
      .send({ decision: 'RETENIR', titre: 'Court', solution: '', etapeId })
      .expect(400);
    expect(refus.body.erreurs).toEqual({
      titre: 'Le piège compte au moins 10 caractères.',
      solution: 'Indiquez ce qui a fonctionné.',
    });
    const retenu = await agent
      .post(`/api/v1/admin/propositions-pieges/${premier!.id}/relecture`)
      .send({
        decision: 'RETENIR',
        titre: 'La couleur de la mer change entre deux images',
        solution: 'Donner la couleur exacte de la mer dans chaque prompt.',
        etapeId,
      })
      .expect(200);
    expect(retenu.body).toMatchObject({ statut: 'RETENUE', piegeId: expect.any(Number) });
    await agent
      .post(`/api/v1/admin/propositions-pieges/${premier!.id}/relecture`)
      .send({ decision: 'ECARTER' })
      .expect(409);
    await agent
      .post(`/api/v1/admin/propositions-pieges/${second!.id}/relecture`)
      .send({ decision: 'ECARTER' })
      .expect(200);

    const [ligne] = await db()
      .select()
      .from(propositionPiege)
      .where(eq(propositionPiege.id, premier!.id));
    expect(ligne).toMatchObject({ statut: 'RETENUE', relecteurId: expect.any(Number) });
    expect(ligne!.dateRelecture).not.toBeNull();
    const explorer = (await membre.get('/api/v1/guides/cite-imaginaire').expect(200))
      .body as GuideApi;
    expect(explorer.pieges.map((p) => [p.titre, p.etapeId])).toEqual([
      ['La couleur de la mer change entre deux images', etapeId],
    ]);
    expect(explorer.moi?.propositions).toEqual([]);
    expect(
      ((await agent.get('/api/v1/admin/propositions-pieges')).body as PropositionsPiegeApi).total,
    ).toBe(0);

    const journal = (await agent.get('/api/v1/admin/journal?domaine=guides').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.slice(0, 2).map((e) => [e.action, e.cible?.nom])).toEqual([
      ['PIEGE_ECARTE', 'Les bâtiments flottent au-dessus de l’eau'],
      ['PIEGE_RETENU', 'La mer change de couleur d’une image à l’autre'],
    ]);
  });

  it('ouvre, clôt et rouvre les objectifs que la communauté cherche encore', async () => {
    const agent = await admin();
    const creees = (
      await agent
        .post('/api/v1/admin/demandes')
        .send({ libelle: 'Podcast en wolof', categorieId: domaine })
        .expect(201)
    ).body as DemandesAdministreesApi;
    expect(creees.ouvertes.map((d) => [d.libelle, d.soutiens])).toEqual([['Podcast en wolof', 0]]);
    const doublon = await agent
      .post('/api/v1/admin/demandes')
      .send({ libelle: 'podcast en wolof', categorieId: '' })
      .expect(400);
    expect(doublon.body.erreurs.libelle).toBe('Cet objectif figure déjà parmi les demandes.');
    const id = creees.ouvertes[0]!.id;

    const closes = (await agent.post(`/api/v1/admin/demandes/${id}/cloture`).expect(200))
      .body as DemandesAdministreesApi;
    expect(closes.ouvertes).toEqual([]);
    expect(closes.closes[0]).toMatchObject({ id, dateCloture: expect.any(String) });
    expect(((await request(serveur()).get('/api/v1/guides')).body as GuidesApi).demandes).toEqual(
      [],
    );
    await agent.post(`/api/v1/admin/demandes/${id}/cloture`).expect(409);

    await agent.delete(`/api/v1/admin/demandes/${id}/cloture`).expect(200);
    expect(
      ((await request(serveur()).get('/api/v1/guides')).body as GuidesApi).demandes.map(
        (d) => d.libelle,
      ),
    ).toEqual(['Podcast en wolof']);

    const journal = (await agent.get('/api/v1/admin/journal?domaine=guides').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.map((e) => [e.action, e.cible?.nom])).toEqual([
      ['DEMANDE_ROUVERTE', 'Podcast en wolof'],
      ['DEMANDE_CLOSE', 'Podcast en wolof'],
      ['DEMANDE_CREEE', 'Podcast en wolof'],
    ]);
  });
});
