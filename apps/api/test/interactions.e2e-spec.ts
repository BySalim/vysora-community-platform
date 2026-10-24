import type { CreationFicheApi, VoteApi } from '@vysora/shared';
import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { contenu, enregistrement, mouvementReputation, sujet } from '../src/db/schema/index.js';
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

describe('Votes et enregistrements (INT-01, S-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();

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

  /** Mouvements de réputation d'un membre : [motif, points]. */
  const mouvements = async (membreId: number) =>
    (
      await contexte.db
        .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, membreId))
        .orderBy(mouvementReputation.id)
    ).map((m) => [m.motif, m.points]);

  async function creerAstuce(auteurId: number): Promise<number> {
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Sujet non créé');
    await contexte.db.insert(sujet).values({
      id: ligne.id,
      typeSujet: 'ASTUCE',
      titre: 'Écrire le texte exact entre guillemets',
      slug: 'ecrire-le-texte-exact-entre-guillemets',
      corps: 'Entre guillemets, le texte d’une affiche sort sans faute bien plus souvent.',
      exempleAvant: 'Une affiche avec le nom de la ville en grand.',
      exempleApres: 'Une affiche avec le titre exact « ZIGUINCHOR » en grand.',
    });
    return ligne.id;
  }

  let auteurId: number;
  let lecteurId: number;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    lecteurId = (await creerMembre(contexte)).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('vote « Utile » (F-30)', () => {
    it('compte le vote une fois, crédite l’auteur de 10 points et l’annule au retrait (RG-40, RG-80, RG-82)', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agent = await agentConnecte('awa.sarr@example.com');
      const voter = () =>
        agent.put(`/api/v1/contenus/${id}/votes/UTILE`).set('Origin', ORIGINE_SITE).expect(200);

      expect((await voter()).body).toEqual({
        type: 'UTILE',
        nombre: 1,
        aVote: true,
      } satisfies VoteApi);
      expect((await voter()).body.nombre).toBe(1);
      expect(await mouvements(auteurId)).toEqual([['VOTE_UTILE_RECU', 10]]);

      const fiche = (await agent.get(`/api/v1/creations/${id}`).expect(200))
        .body as CreationFicheApi;
      expect(fiche.moi?.utile).toBe(true);
      expect(fiche.preuve.utiles).toBe(1);

      const retrait = await agent
        .delete(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(retrait.body).toEqual({ type: 'UTILE', nombre: 0, aVote: false });
      expect(await mouvements(auteurId)).toEqual([
        ['VOTE_UTILE_RECU', 10],
        ['ANNULATION', -10],
      ]);
      // Retirer un vote absent ne change rien.
      await agent
        .delete(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await mouvements(auteurId)).toHaveLength(2);
    });

    it('refuse le vote pour son propre contenu', async () => {
      const id = await creerCreation(contexte, lecteurId);
      const agent = await agentConnecte('awa.sarr@example.com');
      const reponse = await agent
        .put(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(403);
      expect(reponse.body.detail).toBe('Les votes « Utile » viennent des autres membres.');
    });

    it('réserve le vote aux comptes actifs : visiteur 401, adresse non vérifiée 403', async () => {
      const id = await creerCreation(contexte, auteurId);
      await request(serveur())
        .put(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(401);
      await creerMembre(contexte, {
        pseudo: 'kofi',
        email: 'kofi@example.com',
        emailVerifie: false,
      });
      const reponse = await (
        await agentConnecte('kofi@example.com')
      )
        .put(`/api/v1/contenus/${id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(403);
      expect(reponse.body.raison).toBe('email');
    });

    it('ne voit pas un brouillon, une création masquée ni un contenu inconnu (RG-30)', async () => {
      const brouillon = await creerCreation(contexte, auteurId, { publiee: false });
      const masquee = await creerCreation(contexte, auteurId, { statut: 'MASQUE' });
      const agent = await agentConnecte('awa.sarr@example.com');
      for (const id of [brouillon, masquee, 999_999])
        await agent
          .put(`/api/v1/contenus/${id}/votes/UTILE`)
          .set('Origin', ORIGINE_SITE)
          .expect(404);
      await agent
        .put(`/api/v1/contenus/${brouillon}/votes/AUTRE`)
        .set('Origin', ORIGINE_SITE)
        .expect(404);
    });

    it('plafonne à 200 points par jour les points de votes reçus (RG-81)', async () => {
      await contexte.db.insert(mouvementReputation).values({
        beneficiaireId: auteurId,
        points: 195,
        motif: 'VOTE_UTILE_RECU',
      });
      const premiere = await creerCreation(contexte, auteurId);
      const seconde = await creerCreation(contexte, auteurId);
      await creerMembre(contexte, { pseudo: 'kofi', email: 'kofi@example.com' });
      const awa = await agentConnecte('awa.sarr@example.com');
      const kofi = await agentConnecte('kofi@example.com');

      await awa
        .put(`/api/v1/contenus/${premiere}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await kofi
        .put(`/api/v1/contenus/${seconde}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await mouvements(auteurId)).toEqual([
        ['VOTE_UTILE_RECU', 195],
        ['VOTE_UTILE_RECU', 5],
      ]);
      // Un vote qui n'a rien rapporté ne retire rien.
      await kofi
        .delete(`/api/v1/contenus/${seconde}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await mouvements(auteurId)).toHaveLength(2);
    });
  });

  describe('vote « Testé, ça marche » (F-31, RG-41)', () => {
    it('ne s’applique qu’aux astuces, à 5 points', async () => {
      const creation = await creerCreation(contexte, auteurId);
      const astuce = await creerAstuce(auteurId);
      const agent = await agentConnecte('awa.sarr@example.com');
      const refus = await agent
        .put(`/api/v1/contenus/${creation}/votes/TESTE_OK`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
      expect(refus.body.detail).toBe(
        'Le vote « Testé, ça marche » est réservé aux astuces du forum.',
      );
      await agent
        .put(`/api/v1/contenus/${astuce}/votes/TESTE_OK`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await mouvements(auteurId)).toEqual([['VOTE_TESTE_RECU', 5]]);
    });
  });

  describe('enregistrer (F-34, RG-45)', () => {
    it('ajoute une fois à la liste du membre, puis retire', async () => {
      const id = await creerCreation(contexte, auteurId);
      const agent = await agentConnecte('awa.sarr@example.com');
      const enregistrer = () =>
        agent.put(`/api/v1/contenus/${id}/enregistrement`).set('Origin', ORIGINE_SITE).expect(200);
      expect((await enregistrer()).body).toEqual({ enregistre: true });
      await enregistrer();
      const lignes = () =>
        contexte.db.$count(
          enregistrement,
          and(eq(enregistrement.utilisateurId, lecteurId), eq(enregistrement.contenuId, id)),
        );
      expect(await lignes()).toBe(1);
      expect(
        ((await agent.get(`/api/v1/creations/${id}`).expect(200)).body as CreationFicheApi).moi
          ?.enregistree,
      ).toBe(true);

      const retrait = await agent
        .delete(`/api/v1/contenus/${id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(retrait.body).toEqual({ enregistre: false });
      expect(await lignes()).toBe(0);
    });

    it('n’enregistre pas un brouillon d’un autre membre', async () => {
      const id = await creerCreation(contexte, auteurId, { publiee: false });
      const agent = await agentConnecte('awa.sarr@example.com');
      await agent
        .put(`/api/v1/contenus/${id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(404);
      expect(await contexte.db.execute(sql`select 1 from enregistrement`)).toMatchObject({
        rows: [],
      });
    });
  });
});
