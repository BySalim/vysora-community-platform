import type { AccueilApi, ResultatReproduction, TypeCreation } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  casBonReflexe,
  categorie,
  choixOption,
  configurationIa,
  contenu,
  creation,
  defi,
  echange,
  etape,
  licence,
  message,
  momentCle,
  mouvementReputation,
  optionReponse,
  outil,
  reproduction,
  sujet,
  utilisateur,
  vote,
} from '../src/db/schema/index.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const JOUR = 86_400_000;
const ilYA = (jours: number) => new Date(Date.now() - jours * JOUR);

describe('Accueil (ACC-01, F-21)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();
  const db = () => contexte.db;
  let awaId: number;
  let leaId: number;
  let kofiId: number;
  let outilId: number;

  const lire = async (agent = request(serveur())) =>
    (await agent.get('/api/v1/accueil').expect(200)).body as AccueilApi;

  async function agentConnecte(email: string) {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }

  /** Création d'une étape et de ses échanges (un moment clé sur le dernier), publiée par défaut. */
  async function nouvelleCreation(
    titre: string,
    valeurs: {
      auteurId?: number;
      type?: TypeCreation;
      publiee?: boolean;
      statut?: 'VISIBLE' | 'MASQUE';
      date?: Date;
      echanges?: number;
      defiId?: number;
    } = {},
  ): Promise<number> {
    const publiee = valeurs.publiee ?? true;
    const date = valeurs.date ?? ilYA(10);
    const [ligne] = await db()
      .insert(contenu)
      .values({
        typeContenu: 'CREATION',
        auteurId: valeurs.auteurId ?? awaId,
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
        typeCreation: valeurs.type ?? 'ITERATION',
        titre,
        slug: titre.toLowerCase().replace(/[^a-z]+/g, '-'),
        objectif: 'Permettre aux clientes de choisir un créneau disponible.',
        statutPublication: publiee ? 'PUBLIEE' : 'BROUILLON',
        datePublication: publiee ? date : null,
        categorieId: publiee ? domaine.id : null,
        licenceId: cc.id,
        defiId: valeurs.defiId ?? null,
      });
    const [e] = await db()
      .insert(etape)
      .values({ creationId: ligne.id, ordre: 0 })
      .returning({ id: etape.id });
    if (!e) throw new Error('Étape non créée');
    await db().insert(configurationIa).values({ etapeId: e.id, outilId });
    let dernier = 0;
    for (let ordre = 0; ordre < (valeurs.echanges ?? 2); ordre += 1) {
      const [x] = await db()
        .insert(echange)
        .values({ etapeId: e.id, ordre, prompt: `Échange ${ordre + 1} : ${titre}.` })
        .returning({ id: echange.id });
      dernier = x?.id ?? 0;
    }
    await db().insert(momentCle).values({ etapeId: e.id, echangeId: dernier, type: 'CORRECTION' });
    return ligne.id;
  }

  async function reproduire(
    creationId: number,
    auteurId: number,
    resultat: ResultatReproduction,
    date = ilYA(2),
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
        outilId,
        resultat,
        retour: resultat === 'SUCCES' ? null : 'Les créneaux pris restaient sélectionnables.',
      });
  }

  const voterUtile = (contenuId: number, votantId: number, date: Date) =>
    db().insert(vote).values({ votantId, contenuId, typeVoteCode: 'UTILE', dateVote: date });

  async function nouveauCas(titre: string, date: Date): Promise<{ id: number; bonne: number }> {
    const [ligne] = await db()
      .insert(contenu)
      .values({ typeContenu: 'CAS_BON_REFLEXE', auteurId: kofiId, dateCreation: date })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Cas non créé');
    await db()
      .insert(casBonReflexe)
      .values({
        id: ligne.id,
        titre,
        slug: titre.toLowerCase().replace(/[^a-z]+/g, '-'),
        contexte: 'L’IA propose une suppression des doublons fondée sur leur nom.',
        demandeIa: 'Écris un script qui supprime les fichiers en double.',
        reponseIa: 'Ce script supprime tous les fichiers qui portent le même nom.',
        question: 'Que faites-vous ?',
        explication: 'Deux fichiers de même nom peuvent avoir des contenus différents.',
        difficulte: 'INTERMEDIAIRE',
        statutValidation: 'VALIDE',
        dateExamen: date,
      });
    const options = await db()
      .insert(optionReponse)
      .values([
        { casId: ligne.id, ordre: 0, libelle: 'Lancer le script', explication: 'Risqué.' },
        {
          casId: ligne.id,
          ordre: 1,
          libelle: 'Comparer les contenus',
          estCorrecte: true,
          explication: 'Le nom ne suffit pas.',
        },
      ])
      .returning({ id: optionReponse.id, correcte: optionReponse.estCorrecte });
    return { id: ligne.id, bonne: options.find((o) => o.correcte)?.id ?? 0 };
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [premier] = await db()
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.nom, 'Claude'));
    if (!premier) throw new Error('Référentiels absents');
    outilId = premier.id;
  });

  beforeEach(async () => {
    await vider(db(), 'utilisateur', 'contenu', 'mouvement_reputation', 'defi');
    awaId = (await creerMembre(contexte, { nomAffiche: 'Awa Sarr' })).id;
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    kofiId = (await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' })).id;
  });

  afterAll(async () => {
    await vider(db(), 'utilisateur', 'contenu', 'mouvement_reputation', 'defi');
    await contexte.app.close();
  });

  it('répond sans contenu : listes vides, chiffres à zéro, ni cas, ni clinique, ni défi', async () => {
    const accueil = await lire();
    expect(accueil.creations).toEqual({ utiles: [], recentes: [], reproduites: [], exemples: {} });
    expect(accueil.chiffres).toEqual({ creations: 0, reproductions: 0, questionsResolues: 0 });
    expect(accueil.domaines.length).toBeGreaterThan(0);
    expect(accueil.domaines.every((d) => d.creations === 0)).toBe(true);
    expect(accueil).toMatchObject({
      activite: [],
      enAttente: [],
      astuce: null,
      classement: [],
      bonReflexe: { cas: null, reponsesSemaine: 0 },
      clinique: { exemple: null, resolutionMoyenneMinutes: null },
      defi: null,
    });
    // Trois semaines entières avant la semaine en cours, puis jusqu'à aujourd'hui.
    const { debut, parJour } = accueil.apprentissage;
    expect(new Date(`${debut}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(parJour.length).toBeGreaterThanOrEqual(22);
    expect(parJour.length).toBeLessThanOrEqual(28);
    expect(parJour.every((n) => n === 0)).toBe(true);
  });

  it('classe les créations visibles : votes de la semaine (RG-32), nouveautés, reproductions du mois', async () => {
    const ancienne = await nouvelleCreation('Salon de coiffure', { date: ilYA(40) });
    const recente = await nouvelleCreation('Infusion de bissap', {
      type: 'UN_PROMPT',
      echanges: 1,
      date: ilYA(1),
    });
    const projet = await nouvelleCreation('Factures par e-mail', { type: 'PROJET', date: ilYA(5) });
    await nouvelleCreation('Brouillon', { publiee: false, date: ilYA(0) });
    await nouvelleCreation('Masquée', { statut: 'MASQUE', date: ilYA(0) });
    // Beaucoup de votes anciens, peu cette semaine : la semaine compte d'abord.
    for (const [votant, date] of [
      [leaId, ilYA(20)],
      [kofiId, ilYA(20)],
    ] as const)
      await voterUtile(ancienne, votant, date);
    await voterUtile(recente, leaId, ilYA(1));
    await reproduire(ancienne, leaId, 'SUCCES', ilYA(3));
    await reproduire(ancienne, kofiId, 'SUCCES', ilYA(45));
    await reproduire(ancienne, awaId, 'PARTIEL');
    await reproduire(projet, leaId, 'SUCCES');

    const { creations, chiffres } = await lire();
    expect(creations.utiles.map((c) => c.titre)).toEqual([
      'Infusion de bissap',
      'Salon de coiffure',
      'Factures par e-mail',
    ]);
    expect(creations.recentes.map((c) => c.titre)).toEqual([
      'Infusion de bissap',
      'Factures par e-mail',
      'Salon de coiffure',
    ]);
    // Un projet se lit, il ne se reproduit pas.
    expect(creations.reproduites.map((c) => c.titre)).toEqual(['Salon de coiffure']);
    const carte = creations.reproduites[0];
    expect(carte).toMatchObject({
      type: 'ITERATION',
      categorie: { slug: 'application-web' },
      auteur: { nom: 'Awa Sarr' },
      outils: [{ outil: { nom: 'Claude' }, modeles: [] }],
      trace: [false, true],
      moments: 1,
      reproductions: 3,
      tauxReussite: 67,
      utilesSemaine: 0,
      reussitesMois: 1,
    });
    expect(creations.utiles.find((c) => c.type === 'PROJET')).toMatchObject({
      trace: [true],
      reproductions: 0,
      tauxReussite: null,
    });
    expect(creations.exemples.UN_PROMPT?.titre).toBe('Infusion de bissap');
    expect(chiffres).toEqual({ creations: 3, reproductions: 4, questionsResolues: 0 });
  });

  it('montre l’activité publique, jamais les votes, et les questions qui attendent une réponse', async () => {
    const id = await nouvelleCreation('Salon de coiffure', { date: ilYA(3) });
    await reproduire(id, leaId, 'SUCCES', ilYA(2));
    await voterUtile(id, kofiId, ilYA(1));
    const sujets: number[] = [];
    for (const [titre, date] of [
      ['Une question sans réponse', ilYA(1)],
      ['Une question avec réponse', ilYA(0.5)],
    ] as const) {
      const [ligne] = await db()
        .insert(contenu)
        .values({ typeContenu: 'SUJET', auteurId: kofiId, dateCreation: date })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Sujet non créé');
      await db().insert(sujet).values({
        id: ligne.id,
        typeSujet: 'QUESTION',
        titre,
        slug: 'question',
        corps: 'Comment empêcher deux réservations sur le même créneau ?',
        outilId,
      });
      sujets.push(ligne.id);
    }
    const [reponse] = await db()
      .insert(contenu)
      .values({ typeContenu: 'MESSAGE', auteurId: leaId, dateCreation: ilYA(0.2) })
      .returning({ id: contenu.id });
    if (!reponse) throw new Error('Réponse non créée');
    await db()
      .insert(message)
      .values({ id: reponse.id, sujetId: sujets[1] ?? 0, corps: 'Vérifiez côté serveur.' });
    await db()
      .update(sujet)
      .set({ messageAccepteId: reponse.id, dateAcceptationReponse: ilYA(0.1) })
      .where(eq(sujet.id, sujets[1] ?? 0));

    const { activite, enAttente, chiffres } = await lire();
    expect(activite.map((a) => [a.genre, a.membre.pseudo, a.cible?.titre])).toEqual([
      ['reponse-acceptee', 'lea-martin', 'Une question avec réponse'],
      ['sujet', 'kofi-mensah', 'Une question avec réponse'],
      ['sujet', 'kofi-mensah', 'Une question sans réponse'],
      ['reproduction', 'lea-martin', 'Salon de coiffure'],
      ['publication', 'awa-sarr', 'Salon de coiffure'],
    ]);
    expect(activite[0]).toMatchObject({
      points: 15,
      cible: { href: `/forum/${sujets[1]}-question` },
    });
    expect(activite[3]).toMatchObject({ resultat: 'SUCCES', outil: { nom: 'Claude' } });
    expect(enAttente.map((s) => s.titre)).toEqual(['Une question sans réponse']);
    expect(enAttente[0]).toMatchObject({ type: 'QUESTION', outil: { nom: 'Claude' } });
    expect(chiffres.questionsResolues).toBe(1);

    const fil = await request(serveur()).get('/api/v1/accueil/activite').expect(200);
    expect(fil.body.elements).toEqual(activite);
  });

  it('classe la semaine par points gagnés depuis lundi, sans les membres suspendus ni bannis (RG-87)', async () => {
    const lundi = new Date();
    lundi.setUTCHours(0, 0, 0, 0);
    lundi.setUTCDate(lundi.getUTCDate() - ((lundi.getUTCDay() + 6) % 7));
    const avant = new Date(lundi.getTime() - JOUR);
    const pendant = new Date(Math.min(Date.now(), lundi.getTime() + 3600_000));
    await db()
      .insert(mouvementReputation)
      .values([
        { beneficiaireId: awaId, points: 10, motif: 'VOTE_UTILE_RECU', date: pendant },
        { beneficiaireId: awaId, points: 500, motif: 'VOTE_UTILE_RECU', date: avant },
        { beneficiaireId: leaId, points: 15, motif: 'REPONSE_ACCEPTEE', date: pendant },
        { beneficiaireId: kofiId, points: 50, motif: 'REPONSE_ACCEPTEE', date: pendant },
      ]);
    await db().update(utilisateur).set({ statutCompte: 'BANNI' }).where(eq(utilisateur.id, kofiId));

    const { classement } = await lire();
    expect(classement.map((c) => [c.membre.pseudo, c.points])).toEqual([
      ['lea-martin', 15],
      ['awa-sarr', 10],
    ]);
  });

  it('propose à un membre un cas auquel il n’a pas répondu, au visiteur le plus récent (F-21)', async () => {
    const ancien = await nouveauCas('Un script prêt à lancer ?', ilYA(5));
    const recent = await nouveauCas('Une référence qui semble sérieuse', ilYA(1));
    await db()
      .insert(choixOption)
      .values({ utilisateurId: awaId, casId: recent.id, optionId: recent.bonne });

    const visiteur = await lire();
    expect(visiteur.bonReflexe.cas).toMatchObject({ id: recent.id, correction: null, moi: null });
    expect(visiteur.bonReflexe.reponsesSemaine).toBe(1);

    const awa = await lire(await agentConnecte('awa.sarr@example.com'));
    expect(awa.bonReflexe.cas).toMatchObject({ id: ancien.id, moi: { reponse: null } });
    // L'auteur ne répond pas à ses cas : le plus récent lui revient, avec sa correction.
    const kofi = await lire(await agentConnecte('kofi@example.com'));
    expect(kofi.bonReflexe.cas?.id).toBe(recent.id);
    expect(kofi.bonReflexe.cas?.correction).not.toBeNull();
  });

  it('présente le défi en cours, ses participations visibles et ses règles (F-21)', async () => {
    const organisateur = kofiId;
    const [enCours, passe] = await db()
      .insert(defi)
      .values([
        {
          organisateurId: organisateur,
          titre: 'Une affiche touristique en trois échanges',
          slug: 'une-affiche-touristique',
          enonce: 'Créez l’affiche touristique d’un lieu que vous aimez.',
          contraintes: '- Trois échanges au maximum\n- Un texte sans faute\n',
          dateDebut: ilYA(2),
          dateFin: new Date(Date.now() + 5 * JOUR),
          statut: 'PUBLIE',
        },
        {
          organisateurId: organisateur,
          titre: 'Un logo lisible',
          slug: 'un-logo-lisible',
          enonce: 'Créez un logo lisible en petit format.',
          dateDebut: ilYA(12),
          dateFin: ilYA(5),
          statut: 'PUBLIE',
        },
      ])
      .returning({ id: defi.id });
    if (!enCours || !passe) throw new Error('Défis non créés');
    await nouvelleCreation('Affiche de Gorée', { defiId: enCours.id, date: ilYA(1) });
    await nouvelleCreation('Affiche de Saint-Louis', {
      auteurId: leaId,
      defiId: enCours.id,
      date: ilYA(0.5),
    });
    await nouvelleCreation('Affiche masquée', {
      auteurId: kofiId,
      defiId: enCours.id,
      statut: 'MASQUE',
    });

    const accueil = await lire();
    expect(accueil.defi).toMatchObject({
      id: enCours.id,
      regles: ['Trois échanges au maximum', 'Un texte sans faute'],
      participations: 2,
      image: null,
    });
    expect(accueil.defi?.participants.map((p) => p.pseudo)).toEqual(['lea-martin', 'awa-sarr']);
    expect(accueil.activite[0]).toMatchObject({
      genre: 'participation',
      cible: { titre: 'Une affiche touristique en trois échanges' },
    });
  });
});
