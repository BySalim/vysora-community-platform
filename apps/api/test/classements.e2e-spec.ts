import type { ClassementsApi } from '@vysora/shared';
import request from 'supertest';
import { mouvementReputation, utilisateur, vote } from '../src/db/schema/index.js';
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
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
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
});
