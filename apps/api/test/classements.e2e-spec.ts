import type { ClassementsApi } from '@vysora/shared';
import request from 'supertest';
import {
  badge,
  configurationIa,
  creation,
  defi,
  etape,
  mouvementReputation,
  obtentionBadge,
  outil,
  utilisateur,
  vote,
} from '../src/db/schema/index.js';
import { lundiUtc } from '../src/modules/accueil/periodes.js';
import { eq } from 'drizzle-orm';
import {
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Classements (S-08, F-75, RG-87)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();
  const lire = async (agent = request(serveur()), semaine = '') =>
    (await agent.get(`/api/v1/classements${semaine}`).expect(200)).body as ClassementsApi;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation', 'defi');
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation', 'defi');
    await contexte.app.close();
  });

  it('classe la semaine et la réputation totale, membres actifs seulement, rang partagé à égalité', async () => {
    const lundi = lundiUtc(new Date());
    const avant = new Date(lundi.getTime() - 3 * 86_400_000);
    const pendant = new Date(Math.min(Date.now(), lundi.getTime() + 3_600_000));
    const awa = await creerMembre(contexte);
    const lea = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const kofi = await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
    const banni = await creerMembre(contexte, {
      pseudo: 'compte-banni',
      email: 'banni@example.com',
      statutCompte: 'BANNI',
    });
    await contexte.db.insert(mouvementReputation).values([
      { beneficiaireId: awa.id, points: 300, motif: 'VOTE_UTILE_RECU', date: avant },
      { beneficiaireId: awa.id, points: 20, motif: 'VOTE_UTILE_RECU', date: pendant },
      { beneficiaireId: lea.id, points: 20, motif: 'REPONSE_ACCEPTEE', date: pendant },
      { beneficiaireId: kofi.id, points: 5, motif: 'VOTE_UTILE_RECU', date: avant },
      { beneficiaireId: banni.id, points: 900, motif: 'VOTE_UTILE_RECU', date: pendant },
    ]);
    const c = await lire();
    expect(c.semaines).toHaveLength(3);
    expect(c.semaine.statut).toBe('provisoire');
    expect(c.membres.semaine.map((r) => [r.rang, r.membre.pseudo, r.points])).toEqual([
      [1, 'awa-sarr', 20],
      [1, 'lea-martin', 20],
    ]);
    // Awa était première la semaine précédente ; Léa n'y était pas classée.
    expect(c.membres.semaine.map((r) => r.evolution)).toEqual([0, 'nouveau']);
    expect(c.membres.general.map((r) => [r.rang, r.membre.pseudo, r.points, r.evolution])).toEqual([
      [1, 'awa-sarr', 320, null],
      [2, 'lea-martin', 20, null],
      [3, 'kofi-mensah', 5, null],
    ]);
    expect(c.membres).toMatchObject({ classesSemaine: 2, classesGeneral: 3 });
    expect(c.moi).toBeNull();

    // Semaine précédente : arrêtée, Awa en tête.
    const precedente = await lire(undefined, `?semaine=${c.semaines[1]?.debut}`);
    expect(precedente.semaine.statut).toBe('arretee');
    expect(precedente.membres.semaine.map((r) => r.membre.pseudo)).toEqual([
      'awa-sarr',
      'kofi-mensah',
    ]);
    // Une semaine inconnue donne la semaine en cours.
    expect((await lire(undefined, '?semaine=2020-01-06')).semaine).toEqual(c.semaine);

    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({ email: 'kofi@example.com', motDePasse: MOT_DE_PASSE })
      .expect(200);
    expect((await lire(agent)).moi).toEqual({
      points: 0,
      rangSemaine: null,
      rangGeneral: 3,
      reputation: 5,
      niveau: 'curieux',
    });
  });

  it('cite au palmarès les créations jugées utiles pendant la semaine', async () => {
    const auteur = await creerMembre(contexte);
    const votants = await Promise.all(
      [1, 2, 3].map((i) =>
        creerMembre(contexte, { pseudo: `votant-${i}`, email: `votant${i}@example.com` }),
      ),
    );
    const creation = await creerCreation(contexte, auteur.id);
    const ancienne = new Date(lundiUtc(new Date()).getTime() - 86_400_000);
    await contexte.db.insert(vote).values([
      { votantId: votants[0]!.id, contenuId: creation, typeVoteCode: 'UTILE' },
      { votantId: votants[1]!.id, contenuId: creation, typeVoteCode: 'UTILE' },
      { votantId: votants[2]!.id, contenuId: creation, typeVoteCode: 'UTILE', dateVote: ancienne },
    ]);
    const c = await lire();
    expect(c.palmares.utiles).toHaveLength(1);
    expect(c.palmares.utiles[0]).toMatchObject({
      membre: { pseudo: 'awa-sarr' },
      creation: { id: creation, titre: 'Cité imaginaire entre ciel et mer', type: 'UN_PROMPT' },
      nombre: 2,
      points: 20,
    });
    expect(c.chiffres.votes).toBe(2);
    // Un auteur banni sort du palmarès.
    await contexte.db
      .update(utilisateur)
      .set({ statutCompte: 'BANNI' })
      .where(eq(utilisateur.id, auteur.id));
    expect((await lire()).palmares.utiles).toEqual([]);
  });

  it('limite le palmarès à un outil, présente le défi de la semaine et ceux qui progressent', async () => {
    const lundi = lundiUtc(new Date());
    const pendant = new Date(Math.min(Date.now(), lundi.getTime() + 3_600_000));
    const avant = new Date(lundi.getTime() - 86_400_000);
    const awa = await creerMembre(contexte);
    const lea = await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const [midjourney] = await contexte.db.select().from(outil).where(eq(outil.slug, 'midjourney'));
    const [claude] = await contexte.db.select().from(outil).where(eq(outil.slug, 'claude'));
    const image = await creerCreation(contexte, awa.id);
    const texte = await creerCreation(contexte, awa.id);
    for (const [creationId, outilId] of [
      [image, midjourney!.id],
      [texte, claude!.id],
    ] as const) {
      const [e] = await contexte.db
        .insert(etape)
        .values({ creationId, ordre: 1 })
        .returning({ id: etape.id });
      await contexte.db.insert(configurationIa).values({ etapeId: e!.id, outilId });
    }
    await contexte.db.insert(vote).values([
      { votantId: lea.id, contenuId: image, typeVoteCode: 'UTILE', dateVote: pendant },
      { votantId: lea.id, contenuId: texte, typeVoteCode: 'UTILE', dateVote: pendant },
    ]);
    // Défi en cours pendant la semaine : la création de Midjourney y participe.
    const [d] = await contexte.db
      .insert(defi)
      .values({
        organisateurId: awa.id,
        titre: 'Une affiche touristique',
        slug: 'une-affiche-touristique',
        enonce: 'Créez l’affiche d’un lieu que vous aimez.',
        dateDebut: new Date(Date.now() - 2 * 86_400_000),
        dateFin: new Date(Date.now() + 3 * 86_400_000),
        statut: 'PUBLIE',
      })
      .returning({ id: defi.id });
    await contexte.db.update(creation).set({ defiId: d!.id }).where(eq(creation.id, image));
    // Awa passe Apprentie pendant la semaine (50 points, RG-84) et obtient un badge.
    await contexte.db.insert(mouvementReputation).values([
      { beneficiaireId: awa.id, points: 40, motif: 'VOTE_UTILE_RECU', date: avant },
      { beneficiaireId: awa.id, points: 20, motif: 'VOTE_UTILE_RECU', date: pendant },
    ]);
    const [b] = await contexte.db.select().from(badge).where(eq(badge.estActif, true)).limit(1);
    await contexte.db
      .insert(obtentionBadge)
      .values({ utilisateurId: awa.id, badgeId: b!.id, dateObtention: pendant });

    const tous = await lire();
    expect(tous.outil).toBeNull();
    expect(tous.outils.map((o) => [o.slug, o.contributions])).toEqual([
      ['midjourney', 2],
      ['claude', 1],
    ]);
    expect(tous.palmares.utiles.map((e) => e.creation.id).toSorted()).toEqual(
      [image, texte].toSorted(),
    );
    expect(tous.defi?.defi).toMatchObject({ titre: 'Une affiche touristique', etat: 'EN_COURS' });
    expect(tous.defi?.participations.map((p) => p.creation.id)).toEqual([image]);
    expect(tous.progression.niveaux.map((p) => [p.membre.pseudo, p.de, p.vers])).toEqual([
      ['awa-sarr', 'curieux', 'apprenti'],
    ]);
    expect(tous.progression.badges.map((x) => [x.membre.pseudo, x.badge.code])).toEqual([
      ['awa-sarr', b!.code],
    ]);
    expect(tous.progression.badgesObtenus).toBe(1);

    const avecClaude = await lire(undefined, '?outil=claude');
    expect(avecClaude.outil?.nom).toBe('Claude');
    expect(avecClaude.palmares.utiles.map((e) => e.creation.id)).toEqual([texte]);
    expect(avecClaude.defi?.participations).toEqual([]);
    // Le choix de l'outil ne touche ni les chiffres de la semaine ni la progression.
    expect(avecClaude.chiffres).toEqual(tous.chiffres);
    expect(avecClaude.progression).toEqual(tous.progression);
    // Un outil inconnu laisse le palmarès de tous.
    expect((await lire(undefined, '?outil=outil-inconnu')).outil).toBeNull();
  });
});
