import type { ProfilApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  badge,
  contenu,
  message,
  mouvementReputation,
  obtentionBadge,
  outil,
  reproduction,
  sujet,
  utilisateur,
  vote,
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

const JOUR = 86_400_000;

describe('Profil public (PROF-01)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();
  const db = () => contexte.db;
  let clarisseId: number;
  let leaId: number;
  let outilId: number;

  const lire = async (pseudo: string, agent = request(serveur()), statut = 200) =>
    (await agent.get(`/api/v1/membres/${pseudo}`).expect(statut)).body as ProfilApi;

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

  async function nouveauContenu(type: 'SUJET' | 'MESSAGE' | 'REPRODUCTION', auteurId: number) {
    const [ligne] = await db()
      .insert(contenu)
      .values({ typeContenu: type, auteurId })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Contenu non créé');
    return ligne.id;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [claude] = await db().select({ id: outil.id }).from(outil).where(eq(outil.nom, 'Claude'));
    if (!claude) throw new Error('Référentiels absents');
    outilId = claude.id;
  });

  beforeEach(async () => {
    await vider(db(), 'utilisateur', 'contenu', 'mouvement_reputation');
    clarisseId = (
      await creerMembre(contexte, {
        pseudo: 'clarisse-mendy',
        email: 'clarisse@example.com',
        nomAffiche: 'Clarisse Mendy',
        biographie: 'Développeuse indépendante à Ziguinchor.',
        urlSite: 'https://clarisse.example',
      })
    ).id;
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
  });

  afterAll(async () => {
    await vider(db(), 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  it('ne trouve ni un pseudo inconnu ni un compte banni', async () => {
    await lire('personne', request(serveur()), 404);
    await lire('pas<un>pseudo', request(serveur()), 404);
    await db().update(utilisateur).set({ statutCompte: 'BANNI' }).where(eq(utilisateur.id, leaId));
    await lire('lea-martin', request(serveur()), 404);
  });

  it('présente au visiteur les statistiques publiques, les créations, les contributions et les badges', async () => {
    const publiee = await creerCreation(contexte, clarisseId);
    await creerCreation(contexte, clarisseId, { publiee: false });
    await creerCreation(contexte, clarisseId, { statut: 'MASQUE' });
    await db().insert(vote).values({ votantId: leaId, contenuId: publiee, typeVoteCode: 'UTILE' });
    await db().update(contenu).set({ nbVues: 12 }).where(eq(contenu.id, publiee));
    // Léa reproduit la création de Clarisse ; Clarisse reproduit une création de Léa.
    const essaiRecu = await nouveauContenu('REPRODUCTION', leaId);
    await db()
      .insert(reproduction)
      .values({ id: essaiRecu, creationId: publiee, outilId, resultat: 'SUCCES' });
    const creationLea = await creerCreation(contexte, leaId);
    const essai = await nouveauContenu('REPRODUCTION', clarisseId);
    await db().insert(reproduction).values({
      id: essai,
      creationId: creationLea,
      outilId,
      resultat: 'PARTIEL',
      retour: 'Les créneaux pris restaient sélectionnables.',
    });
    // Réponse acceptée de Clarisse dans un sujet de Léa.
    const sujetId = await nouveauContenu('SUJET', leaId);
    await db().insert(sujet).values({
      id: sujetId,
      typeSujet: 'QUESTION',
      titre: 'Comment éviter deux réservations sur le même créneau ?',
      slug: 'deux-reservations',
      corps: 'Deux clientes réservent parfois le même créneau en même temps.',
      outilId,
    });
    const reponse = await nouveauContenu('MESSAGE', clarisseId);
    await db()
      .insert(message)
      .values({ id: reponse, sujetId, corps: 'Vérifiez le créneau côté serveur.' });
    await db()
      .update(sujet)
      .set({ messageAccepteId: reponse, dateAcceptationReponse: new Date() })
      .where(eq(sujet.id, sujetId));
    const [pionnier] = await db()
      .select({ id: badge.id })
      .from(badge)
      .where(eq(badge.code, 'PIONNIER'));
    if (pionnier)
      await db().insert(obtentionBadge).values({ utilisateurId: clarisseId, badgeId: pionnier.id });

    // L'adresse ne tient pas compte de la casse.
    const profil = await lire('Clarisse-Mendy');
    expect(profil.membre).toMatchObject({
      pseudo: 'clarisse-mendy',
      nom: 'Clarisse Mendy',
      role: 'MEMBRE',
      biographie: 'Développeuse indépendante à Ziguinchor.',
      lien: 'https://clarisse.example',
    });
    expect(profil.statistiques).toEqual({
      creations: 1,
      utiles: 1,
      reproductions: 1,
      reussies: 1,
      tauxReussite: null,
      reponsesAcceptees: 1,
      vues: 12,
    });
    expect(profil.creations.map((c) => c.id)).toEqual([publiee]);
    expect(profil.creations[0]).toMatchObject({ utiles: 1, reproductions: 1, reussies: 1 });
    expect(profil.contributions.map((c) => c.genre).toSorted()).toEqual([
      'creation',
      'essai',
      'reponse',
    ]);
    expect(profil.contributions.find((c) => c.genre === 'reponse')).toMatchObject({
      acceptee: true,
      auteur: { pseudo: 'lea-martin' },
      outil: { nom: 'Claude' },
    });
    expect(profil.contributions.find((c) => c.genre === 'essai')).toMatchObject({
      resultat: 'PARTIEL',
      creation: { id: creationLea },
      auteur: { pseudo: 'lea-martin' },
    });
    expect(profil.badges.map((b) => b.code)).toEqual(['PIONNIER']);
    expect(profil.prive).toBeNull();

    // Un autre membre ne voit pas non plus la progression (RG-88).
    const lea = await agentConnecte('lea@example.com');
    expect((await lire('clarisse-mendy', lea)).prive).toBeNull();
  });

  it('donne au propriétaire sa progression : réputation détaillée, semaines, limites, brouillons (RG-88)', async () => {
    const maintenant = Date.now();
    const brouillon = await creerCreation(contexte, clarisseId, { publiee: false });
    const [vote1, vote2] = await db()
      .insert(mouvementReputation)
      .values([
        {
          beneficiaireId: clarisseId,
          points: 10,
          motif: 'VOTE_UTILE_RECU',
          date: new Date(maintenant - 20 * JOUR),
        },
        {
          beneficiaireId: clarisseId,
          points: 10,
          motif: 'VOTE_UTILE_RECU',
          date: new Date(maintenant - 2 * JOUR),
        },
        {
          beneficiaireId: clarisseId,
          points: 1,
          motif: 'CAS_REUSSI',
          date: new Date(maintenant - JOUR),
        },
      ])
      .returning({ id: mouvementReputation.id });
    // Un vote retiré : son mouvement est annulé (RG-82).
    await db()
      .insert(mouvementReputation)
      .values({
        beneficiaireId: clarisseId,
        points: -10,
        motif: 'ANNULATION',
        mouvementAnnuleId: vote2?.id,
        date: new Date(maintenant - JOUR),
      });
    expect(vote1).toBeDefined();

    const agent = await agentConnecte('clarisse@example.com');
    const { prive, membre } = await lire('clarisse-mendy', agent);
    expect(membre.reputation).toBe(11);
    expect(prive?.reputation.total).toBe(11);
    expect(prive?.reputation.details.toSorted((a, b) => a.motif.localeCompare(b.motif))).toEqual([
      { motif: 'CAS_REUSSI', typeContenu: null, pointsUnitaires: null, nombre: 1, points: 1 },
      { motif: 'VOTE_UTILE_RECU', typeContenu: null, pointsUnitaires: null, nombre: 1, points: 10 },
    ]);
    const semaines = prive?.reputation.parSemaine ?? [];
    expect(semaines.length).toBeGreaterThanOrEqual(1);
    expect(semaines.at(-1)?.valeur).toBe(11);
    expect(new Date(`${semaines.at(-1)?.semaine}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(prive?.limites).toEqual({
      creations: { utilisees: 0, limite: 3 },
      sujets: { utilisees: 0, limite: 3 },
      reponses: { utilisees: 0, limite: 20 },
    });
    expect(prive?.brouillons).toMatchObject({ nombre: 1, dernier: { id: brouillon } });
    expect(prive?.apprentissage).toEqual({
      casRepondus: 0,
      casReussis: 0,
      reproductionsDeclarees: 0,
    });
  });

  it('modifie la biographie et le lien (F-05), refuse un lien non sécurisé', async () => {
    const agent = await agentConnecte('clarisse@example.com');
    const modifier = (corps: object, statut = 200) =>
      agent.patch('/api/v1/moi/profil').set('Origin', ORIGINE_SITE).send(corps).expect(statut);

    expect(
      (
        await modifier({
          biographie: '  Je publie mes outils.\n\n\n\nErreurs comprises.  ',
          lien: 'clarisse.sn',
        })
      ).body,
    ).toEqual({
      biographie: 'Je publie mes outils.\n\nErreurs comprises.',
      lien: 'https://clarisse.sn',
    });

    const nonSecurise = await modifier({ lien: 'http://clarisse.sn' }, 400);
    expect(nonSecurise.body.erreurs).toEqual({ lien: 'Utilisez une adresse sécurisée, en https.' });
    const incomplet = await modifier({ lien: 'javascript:alert(1)' }, 400);
    expect(incomplet.body.erreurs.lien).toMatch(/incomplète|sécurisée/);
    await modifier({ biographie: 'x'.repeat(501) }, 400);

    expect((await modifier({ biographie: '', lien: '' })).body).toEqual({
      biographie: null,
      lien: null,
    });
    // Un compte dont l'adresse n'est pas confirmée ne publie rien, pas même sa biographie.
    await db()
      .update(utilisateur)
      .set({ emailVerifie: false })
      .where(eq(utilisateur.id, clarisseId));
    await modifier({ biographie: 'Bonjour' }, 403);
  });
});
