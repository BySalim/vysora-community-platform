import type {
  ApprentissageApi,
  CasApi,
  CasSaisi,
  ListeCasApi,
  ListeCasAValiderApi,
  MesCasApi,
  ReponseCasApi,
} from '@vysora/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { choixOption, mouvementReputation, outil } from '../src/db/schema/index.js';
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

describe('Bon réflexe (APP-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let leaId: number;
  let awaId: number;
  let kofiId: number;
  let outilId: number;

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    // Limites de débit par adresse : chaque test a la sienne.
    return agent.set('X-Forwarded-For', ip);
  }
  /** Lea est Experte (1 500 points) ; Awa et Kofi sont membres ; Thomas et Sophie modèrent. */
  const lea = () => agentConnecte('lea@example.com');
  const awa = () => agentConnecte('awa.sarr@example.com');
  const kofi = () => agentConnecte('kofi@example.com');
  const thomas = () => agentConnecte('thomas@example.com');
  const sophie = () => agentConnecte('sophie@example.com');
  const visiteur = () => request.agent(serveur()).set('X-Forwarded-For', ip);

  const option = (libelle: string, correcte = false, id?: number) => ({
    ...(id ? { id } : {}),
    libelle,
    correcte,
    explication: `Pourquoi « ${libelle} » est ${correcte ? 'la bonne réponse' : 'à écarter'}.`,
  });
  const nouveauCas = (valeurs: Partial<CasSaisi> = {}): CasSaisi => ({
    titre: 'Des ventes en hausse ?',
    contexte: 'Les ventes passent de 120 à 150 commandes. Vous demandez la hausse à l’IA.',
    demandeIa: 'Mes ventes passent de 120 à 150 commandes. Calcule la hausse.',
    reponseIa: 'Les ventes ont augmenté de 30 % : vous avez gagné 30 commandes.',
    question: 'Que faites-vous ?',
    explication:
      'La hausse se rapporte à la valeur de départ : (150 − 120) ÷ 120 = 25 %, et non 30 %.',
    difficulte: 'DEBUTANT',
    outilId,
    modeleNonReference: 'GPT-5',
    etiquettes: ['Calcul'],
    options: [
      option('Publier le résultat tel quel'),
      option('Vérifier le calcul à partir de 120', true),
      option('Demander une phrase plus courte'),
    ],
    ...valeurs,
  });

  const proposer = (agent: Agent, corps: object = nouveauCas()) =>
    agent.post('/api/v1/cas').set('Origin', ORIGINE_SITE).send(corps);
  const modifier = (agent: Agent, id: number, corps: object) =>
    agent.put(`/api/v1/cas/${id}`).set('Origin', ORIGINE_SITE).send(corps);
  const examiner = (agent: Agent, id: number, decision: 'VALIDE' | 'REFUSE', motif?: string) =>
    agent.put(`/api/v1/cas/${id}/examen`).set('Origin', ORIGINE_SITE).send({ decision, motif });
  const repondre = (agent: Agent, id: number, optionId: number | undefined) =>
    agent.post(`/api/v1/cas/${id}/reponses`).set('Origin', ORIGINE_SITE).send({ optionId });
  const lire = async (id: number, agent?: Agent) =>
    (await (agent ?? visiteur()).get(`/api/v1/cas/${id}`).expect(200)).body as CasApi;
  const lister = async (parametres = '', agent?: Agent) =>
    (await (agent ?? visiteur()).get(`/api/v1/cas${parametres}`).expect(200)).body as ListeCasApi;
  const decider = (agent: Agent, id: number, action: string) =>
    agent
      .post(`/api/v1/moderation/contenus/${id}/decisions`)
      .set('Origin', ORIGINE_SITE)
      .send({ action, motif: 'Contenu examiné par la modération.' })
      .expect(201);

  /** Cas proposé par Lea puis validé par Thomas. */
  async function casValide(valeurs: Partial<CasSaisi> = {}): Promise<CasApi> {
    const propose = (await proposer(await lea(), nouveauCas(valeurs)).expect(201)).body as CasApi;
    return (await examiner(await thomas(), propose.id, 'VALIDE').expect(200)).body as CasApi;
  }

  /** Mouvements de réputation d'un membre, hors points donnés au départ : [motif, points]. */
  const mouvements = async (membreId: number) =>
    (
      await contexte.db
        .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
        .from(mouvementReputation)
        .where(
          and(
            eq(mouvementReputation.beneficiaireId, membreId),
            sql`${mouvementReputation.contenuId} is not null`,
          ),
        )
        .orderBy(asc(mouvementReputation.id))
    ).map((m) => [m.motif, m.points]);
  const indexe = async (id: number) =>
    (
      await contexte.db.execute<{ n: number }>(
        sql`select count(*)::int as n from recherche_document where contenu_id = ${id}`,
      )
    ).rows[0]?.n === 1;

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [o] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .limit(1);
    if (!o) throw new Error('Référentiels absents');
    outilId = o.id;
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    awaId = (await creerMembre(contexte)).id;
    kofiId = (await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' })).id;
    await creerMembre(contexte, {
      pseudo: 'thomas-diallo',
      email: 'thomas@example.com',
      role: 'MODERATEUR',
    });
    await creerMembre(contexte, {
      pseudo: 'sophie-ba',
      email: 'sophie@example.com',
      role: 'MODERATEUR',
    });
    // RG-84 : niveau Expert à 1 500 points, reçus avant-hier (hors du plafond du jour, RG-81) et sans
    // contenu d'origine (hors des comptes de mouvements ci-dessus).
    await contexte.db.insert(mouvementReputation).values({
      beneficiaireId: leaId,
      points: 1500,
      motif: 'VOTE_UTILE_RECU',
      date: new Date(Date.now() - 2 * 24 * 3_600_000),
    });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('proposer un cas (F-60)', () => {
    it('un membre de niveau Expert propose un cas, visible de lui et de la modération (RG-70, RG-30)', async () => {
      const auteur = await lea();
      const propose = (await proposer(auteur).expect(201)).body as CasApi;
      expect(propose).toMatchObject({
        statut: 'PROPOSE',
        slug: 'des-ventes-en-hausse',
        dateValidation: null,
        examen: null,
        modeleNonReference: 'GPT-5',
        outil: { id: outilId },
        etiquettes: [{ libelle: 'Calcul', slug: 'calcul' }],
        auteur: { pseudo: 'lea-martin' },
        position: null,
        moi: { auteur: true, reponse: null, peutExaminer: false },
      });
      expect(propose.options.map((o) => o.libelle)).toEqual([
        'Publier le résultat tel quel',
        'Vérifier le calcul à partir de 120',
        'Demander une phrase plus courte',
      ]);
      // L'auteur relit son cas avec la correction.
      expect(propose.correction).toMatchObject({
        optionCorrecteId: propose.options[1]?.id,
        reponses: 0,
        reussite: 0,
      });

      // RG-30 : ni les visiteurs ni les autres membres ne le voient, ni dans la liste, ni par la recherche.
      await visiteur().get(`/api/v1/cas/${propose.id}`).expect(404);
      await (await kofi()).get(`/api/v1/cas/${propose.id}`).expect(404);
      expect((await lister()).total).toBe(0);
      expect(await indexe(propose.id)).toBe(false);
      const vu = await lire(propose.id, await thomas());
      expect(vu.moi).toMatchObject({ auteur: false, peutExaminer: true });
      expect(vu.correction).not.toBeNull();
    });

    it('refuse un visiteur, un membre sous le niveau Expert ; accepte la modération (RG-70, CI-30)', async () => {
      expect((await proposer(visiteur()).expect(401)).body.raison).toBe('connexion');
      expect((await proposer(await awa()).expect(403)).body.raison).toBe('niveau');
      const parLaModeration = (await proposer(await thomas()).expect(201)).body as CasApi;
      expect(parLaModeration.statut).toBe('PROPOSE');
    });

    it('refuse un cas sans une seule bonne réponse et une option d’un autre cas (CI-16)', async () => {
      const auteur = await lea();
      const deux = await proposer(
        auteur,
        nouveauCas({ options: [option('Oui', true), option('Non', true)] }),
      ).expect(400);
      expect(deux.body.erreurs).toEqual({ options: 'Une seule option est la bonne réponse.' });
      const autre = (await proposer(auteur).expect(201)).body as CasApi;
      const emprunt = await proposer(
        auteur,
        nouveauCas({
          options: [option('Oui', true, autre.options[0]?.id), option('Non')],
        }),
      ).expect(400);
      expect(emprunt.body.erreurs).toEqual({
        'options.0.id': 'Cette option n’appartient pas à ce cas.',
      });
    });
  });

  describe('valider ou refuser (F-61)', () => {
    it('refus motivé, correction par l’auteur, puis validation et ses points (RG-71, CI-18, RG-80)', async () => {
      const auteur = await lea();
      const equipe = await thomas();
      const propose = (await proposer(auteur).expect(201)).body as CasApi;

      expect((await examiner(equipe, propose.id, 'REFUSE').expect(400)).body.erreurs).toEqual({
        motif: 'Rédigez le motif du refus, communiqué à l’auteur.',
      });
      const refuse = (
        await examiner(equipe, propose.id, 'REFUSE', 'Précisez la demande faite à l’IA.').expect(
          200,
        )
      ).body as CasApi;
      expect(refuse).toMatchObject({
        statut: 'REFUSE',
        examen: { motif: 'Précisez la demande faite à l’IA.', par: { pseudo: 'thomas-diallo' } },
        moi: { peutExaminer: false },
      });
      // L'auteur lit le motif, pas le nom du modérateur.
      expect((await lire(propose.id, auteur)).examen).toMatchObject({
        motif: 'Précisez la demande faite à l’IA.',
        par: null,
      });
      expect((await examiner(await sophie(), propose.id, 'VALIDE').expect(409)).body.detail).toBe(
        'Ce cas a déjà été refusé : son auteur peut le corriger et le soumettre de nouveau.',
      );

      // CV-04 : corrigé, il est soumis de nouveau, sans examen.
      const corrige = (
        await modifier(
          auteur,
          propose.id,
          nouveauCas({
            demandeIa: 'Mes ventes passent de 120 commandes en août à 150 en septembre.',
            options: propose.options.map((o, i) => option(o.libelle, i === 1, o.id)),
          }),
        ).expect(200)
      ).body as CasApi;
      expect(corrige).toMatchObject({ statut: 'PROPOSE', examen: null });
      expect(corrige.dateModification).not.toBeNull();

      const valide = (await examiner(await sophie(), propose.id, 'VALIDE').expect(200))
        .body as CasApi;
      expect(valide).toMatchObject({
        statut: 'VALIDE',
        examen: { motif: null, par: { pseudo: 'sophie-ba' } },
        position: { rang: 1, total: 1, suivant: null },
      });
      expect(valide.dateValidation).not.toBeNull();
      expect(await mouvements(leaId)).toEqual([['CAS_VALIDE', 10]]);
      expect((await examiner(equipe, propose.id, 'VALIDE').expect(409)).body.detail).toBe(
        'Ce cas est déjà validé.',
      );

      // Publié : dans la liste et la recherche (RG-31).
      expect((await lister()).elements.map((c) => c.id)).toEqual([propose.id]);
      expect((await lister('?q=septembre')).total).toBe(1);
      expect(await indexe(propose.id)).toBe(true);
    });

    it('jamais ses propres cas ; jamais sans le rôle de modération (RG-71)', async () => {
      const propose = (await proposer(await thomas()).expect(201)).body as CasApi;
      expect(propose.moi?.peutExaminer).toBe(false);
      expect((await examiner(await thomas(), propose.id, 'VALIDE').expect(403)).body.detail).toBe(
        'Ce cas est le vôtre : un autre membre de l’équipe de modération l’examinera.',
      );
      expect((await examiner(await lea(), propose.id, 'VALIDE').expect(403)).body.raison).toBe(
        'role',
      );
      await examiner(await sophie(), propose.id, 'VALIDE').expect(200);
    });

    it('liste les cas à valider, du plus anciennement soumis au plus récent (EC-20)', async () => {
      const premier = (await proposer(await lea()).expect(201)).body as CasApi;
      const second = (
        await proposer(await thomas(), nouveauCas({ titre: 'Une source inventée ?' })).expect(201)
      ).body as CasApi;
      const troisieme = (
        await proposer(await lea(), nouveauCas({ titre: 'Un script à lancer ?' })).expect(201)
      ).body as CasApi;
      await examiner(await thomas(), troisieme.id, 'VALIDE').expect(200);
      await (await awa()).get('/api/v1/moderation/cas').expect(403);
      const liste = (await (await thomas()).get('/api/v1/moderation/cas').expect(200))
        .body as ListeCasAValiderApi;
      expect(liste).toMatchObject({ total: 2, suivant: null });
      expect(liste.elements.map((c) => [c.id, c.mien, c.nouvelleSoumission])).toEqual([
        [premier.id, false, false],
        [second.id, true, false],
      ]);
      expect(liste.elements[0]).toMatchObject({ auteur: { pseudo: 'lea-martin' }, masquee: false });
    });
  });

  describe('répondre à un cas (F-62)', () => {
    it('réponse définitive, correction et répartition, point d’une bonne réponse (RG-72, RG-80)', async () => {
      const cas = await casValide();
      const [faux, juste] = cas.options;
      // Avant de répondre : les options seules, sans la correction.
      const avant = await lire(cas.id, await kofi());
      expect(avant.correction).toBeNull();
      expect(avant.options[0]).toEqual({ id: faux?.id, libelle: faux?.libelle });

      const deAwa = (await repondre(await awa(), cas.id, faux?.id).expect(200))
        .body as ReponseCasApi;
      expect(deAwa).toMatchObject({ correcte: false, enregistree: true });
      expect(deAwa.date).not.toBeNull();
      const agentKofi = await kofi();
      const deKofi = (await repondre(agentKofi, cas.id, juste?.id).expect(200))
        .body as ReponseCasApi;
      expect(deKofi.correcte).toBe(true);
      expect(deKofi.correction).toMatchObject({
        optionCorrecteId: juste?.id,
        reponses: 2,
        reussite: 50,
        explication: nouveauCas().explication,
      });
      expect(deKofi.correction.options.map((o) => [o.reponses, o.part])).toEqual([
        [1, 50],
        [1, 50],
        [0, 0],
      ]);
      expect(await mouvements(kofiId)).toEqual([['CAS_REUSSI', 1]]);
      expect(await mouvements(awaId)).toEqual([]);

      // RG-72 : la première réponse est définitive.
      expect((await repondre(agentKofi, cas.id, faux?.id).expect(409)).body.detail).toBe(
        'Vous avez déjà répondu à ce cas : votre première réponse est définitive.',
      );
      const relu = await lire(cas.id, agentKofi);
      expect(relu.moi?.reponse).toMatchObject({ optionId: juste?.id, correcte: true });
      expect(relu.correction?.reponses).toBe(2);
      expect((await lister('', agentKofi)).elements[0]).toMatchObject({
        reponses: 2,
        reussite: 50,
        maReponse: { correcte: true },
      });
    });

    it('un visiteur et un compte en lecture seule voient la correction sans enregistrement (F-62)', async () => {
      const cas = await casValide();
      const deVisiteur = (await repondre(visiteur(), cas.id, cas.options[1]?.id).expect(200))
        .body as ReponseCasApi;
      expect(deVisiteur).toMatchObject({ correcte: true, enregistree: false, date: null });
      expect(deVisiteur.correction.reponses).toBe(0);

      await creerMembre(contexte, {
        pseudo: 'moussa-diallo',
        email: 'moussa@example.com',
        emailVerifie: false,
      });
      const enLecture = (
        await repondre(
          await agentConnecte('moussa@example.com'),
          cas.id,
          cas.options[0]?.id,
        ).expect(200)
      ).body as ReponseCasApi;
      expect(enLecture).toMatchObject({ correcte: false, enregistree: false });
      expect(await contexte.db.$count(choixOption)).toBe(0);
    });

    it('refuse l’auteur, une option d’un autre cas, un cas qui n’est pas validé (RG-72, CI-17)', async () => {
      const cas = await casValide();
      expect(
        (await repondre(await lea(), cas.id, cas.options[1]?.id).expect(403)).body.detail,
      ).toBe('Vous êtes l’auteur de ce cas : vous ne pouvez pas y répondre.');
      const autre = (await proposer(await lea()).expect(201)).body as CasApi;
      expect(
        (await repondre(await kofi(), cas.id, autre.options[0]?.id).expect(400)).body.erreurs,
      ).toEqual({ optionId: 'Choisissez une des options de ce cas.' });
      expect((await repondre(await kofi(), cas.id, undefined).expect(400)).body.erreurs).toEqual({
        optionId: 'Choisissez une réponse avant de valider.',
      });
      await repondre(await kofi(), autre.id, autre.options[0]?.id).expect(404);
      expect(
        (await repondre(await thomas(), autre.id, autre.options[0]?.id).expect(409)).body.detail,
      ).toBe('Ce cas n’est pas validé : il ne reçoit pas encore de réponses.');
    });
  });

  describe('modifier et supprimer (RG-71, RG-72)', () => {
    it('un cas validé modifié est soumis de nouveau ; ses options restent si des réponses existent', async () => {
      const auteur = await lea();
      const cas = await casValide();
      await repondre(await kofi(), cas.id, cas.options[1]?.id).expect(200);
      const ajout = await modifier(
        auteur,
        cas.id,
        nouveauCas({
          options: [
            ...cas.options.map((o, i) => option(o.libelle, i === 1, o.id)),
            option('Autre'),
          ],
        }),
      ).expect(400);
      expect(ajout.body.erreurs.options).toMatch(/ne changent plus/);
      await modifier(
        auteur,
        cas.id,
        nouveauCas({ options: cas.options.map((o, i) => option(o.libelle, i === 0, o.id)) }),
      ).expect(400);

      const corrige = (
        await modifier(
          auteur,
          cas.id,
          nouveauCas({
            options: cas.options.map((o, i) => option(`${o.libelle}, corrigé`, i === 1, o.id)),
          }),
        ).expect(200)
      ).body as CasApi;
      expect(corrige).toMatchObject({ statut: 'PROPOSE', examen: null, position: null });
      // Les réponses restent (RG-72) ; le cas sort de la liste et de la recherche.
      expect(corrige.correction?.reponses).toBe(1);
      expect((await lister()).total).toBe(0);
      expect(await indexe(cas.id)).toBe(false);
      await visiteur().get(`/api/v1/cas/${cas.id}`).expect(404);

      // RG-80 : validé de nouveau, il ne rapporte pas une seconde fois ses points.
      await examiner(await sophie(), cas.id, 'VALIDE').expect(200);
      expect(await mouvements(leaId)).toEqual([['CAS_VALIDE', 10]]);
      // Modifié puis refusé : les points de la validation sont annulés (RG-82).
      await modifier(
        auteur,
        cas.id,
        nouveauCas({ options: corrige.options.map((o, i) => option(o.libelle, i === 1, o.id)) }),
      ).expect(200);
      await examiner(await thomas(), cas.id, 'REFUSE', 'La réponse étudiée a changé.').expect(200);
      expect(await mouvements(leaId)).toEqual([
        ['CAS_VALIDE', 10],
        ['ANNULATION', -10],
      ]);
    });

    it('sans réponse, les options se réordonnent et la bonne réponse change', async () => {
      const auteur = await lea();
      const propose = (await proposer(auteur).expect(201)).body as CasApi;
      const [a, b, c] = propose.options;
      const modifie = (
        await modifier(
          auteur,
          propose.id,
          nouveauCas({
            options: [
              option('Nouvelle option', true),
              option(c?.libelle ?? '', false, c?.id),
              option(a?.libelle ?? '', false, a?.id),
            ],
          }),
        ).expect(200)
      ).body as CasApi;
      expect(modifie.options.map((o) => o.id)).toEqual([expect.any(Number), c?.id, a?.id]);
      expect(modifie.options.map((o) => o.id)).not.toContain(b?.id);
      expect(modifie.correction?.optionCorrecteId).toBe(modifie.options[0]?.id);
    });

    it('seul l’auteur modifie ou supprime ; supprimé, le cas disparaît et ses points sont annulés (RG-82)', async () => {
      const cas = await casValide();
      await repondre(await kofi(), cas.id, cas.options[1]?.id).expect(200);
      await modifier(await awa(), cas.id, nouveauCas()).expect(403);
      await (await awa()).delete(`/api/v1/cas/${cas.id}`).set('Origin', ORIGINE_SITE).expect(403);
      await (await lea()).delete(`/api/v1/cas/${cas.id}`).set('Origin', ORIGINE_SITE).expect(204);
      await visiteur().get(`/api/v1/cas/${cas.id}`).expect(404);
      await (await lea()).get(`/api/v1/cas/${cas.id}`).expect(404);
      expect(await mouvements(leaId)).toEqual([
        ['CAS_VALIDE', 10],
        ['ANNULATION', -10],
      ]);
      expect(await mouvements(kofiId)).toEqual([
        ['CAS_REUSSI', 1],
        ['ANNULATION', -1],
      ]);
      expect(await indexe(cas.id)).toBe(false);
    });
  });

  describe('interactions et modération', () => {
    it('vote « Utile », enregistrement et signalement sur un cas validé seulement (RG-41, S-01, F-90)', async () => {
      const valide = await casValide();
      const propose = (await proposer(await lea()).expect(201)).body as CasApi;
      const membre = await kofi();
      await membre
        .put(`/api/v1/contenus/${valide.id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await membre
        .put(`/api/v1/contenus/${propose.id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(404);
      await membre
        .put(`/api/v1/contenus/${valide.id}/votes/TESTE_OK`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
      await membre
        .put(`/api/v1/contenus/${valide.id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await membre
        .put(`/api/v1/contenus/${propose.id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(404);
      await membre
        .post(`/api/v1/contenus/${valide.id}/signalements`)
        .set('Origin', ORIGINE_SITE)
        .send({ motif: 'HORS_SUJET' })
        .expect(201);
      expect((await lire(valide.id, membre)).moi).toMatchObject({
        utile: true,
        enregistre: true,
        signalementOuvert: true,
      });
      expect((await lire(valide.id)).utiles).toBe(1);
      // RG-80 : +5 pour un vote « Utile » sur un cas.
      expect(await mouvements(leaId)).toEqual([
        ['CAS_VALIDE', 10],
        ['VOTE_UTILE_RECU', 5],
      ]);
    });

    it('masqué puis rétabli : sort de la liste, points annulés puis rendus, recherche rétablie (RG-82)', async () => {
      const cas = await casValide();
      await repondre(await kofi(), cas.id, cas.options[1]?.id).expect(200);
      const equipe = await sophie();
      await decider(equipe, cas.id, 'MASQUER');
      expect((await lister()).total).toBe(0);
      expect(await indexe(cas.id)).toBe(false);
      const vuParLAuteur = await lire(cas.id, await lea());
      expect(vuParLAuteur).toMatchObject({ masquee: true, position: null });
      expect(vuParLAuteur.masquage).not.toBeNull();
      expect(
        (await repondre(await thomas(), cas.id, cas.options[1]?.id).expect(409)).body.detail,
      ).toBe('Ce cas est masqué par la modération : il ne reçoit pas de réponses.');
      expect(await mouvements(kofiId)).toEqual([
        ['CAS_REUSSI', 1],
        ['ANNULATION', -1],
      ]);

      await decider(equipe, cas.id, 'RETABLIR');
      expect((await lister()).total).toBe(1);
      expect(await indexe(cas.id)).toBe(true);
      expect(await mouvements(leaId)).toEqual([
        ['CAS_VALIDE', 10],
        ['ANNULATION', -10],
        ['CAS_VALIDE', 10],
      ]);
    });
  });

  describe('listes et statistiques', () => {
    it('filtres, puces de niveau, cas non répondus, tris et pages (EC-09)', async () => {
      const premier = await casValide({ titre: 'Des ventes en hausse ?' });
      const second = await casValide({ titre: 'Une source inventée ?', difficulte: 'AVANCE' });
      const troisieme = await casValide({
        titre: 'Un script prêt à lancer ?',
        difficulte: 'AVANCE',
        etiquettes: ['Script'],
      });
      const membre = await kofi();
      await repondre(membre, second.id, second.options[1]?.id).expect(200);
      await repondre(await awa(), second.id, second.options[0]?.id).expect(200);

      const tous = await lister();
      expect(tous.elements.map((c) => c.id)).toEqual([troisieme.id, second.id, premier.id]);
      expect(tous).toMatchObject({ total: 3, page: 1, pages: 1 });
      expect(tous.parDifficulte).toEqual({ DEBUTANT: 1, INTERMEDIAIRE: 0, AVANCE: 2 });
      expect(tous.elements[1]).toMatchObject({
        reponses: 2,
        reussite: 50,
        utiles: 0,
        modele: 'GPT-5',
        auteur: { pseudo: 'lea-martin' },
        maReponse: null,
      });

      const avances = await lister('?difficulte=AVANCE');
      expect(avances.total).toBe(2);
      // Les puces gardent le nombre de chaque niveau.
      expect(avances.parDifficulte).toEqual({ DEBUTANT: 1, INTERMEDIAIRE: 0, AVANCE: 2 });
      expect((await lister('?etiquette=script')).elements.map((c) => c.id)).toEqual([troisieme.id]);
      expect((await lister('?tri=repondus')).elements[0]?.id).toBe(second.id);
      expect((await lister('?tri=anciens')).elements[0]?.id).toBe(premier.id);
      expect((await lister('?nonRepondus=true', membre)).elements.map((c) => c.id)).toEqual([
        troisieme.id,
        premier.id,
      ]);
      // L'auteur ne répond pas à ses cas : aucun n'est « à faire » pour lui.
      expect((await lister('?nonRepondus=true', await lea())).total).toBe(0);
      expect((await lister('?page=9')).page).toBe(1);
      await visiteur().get('/api/v1/cas?tri=hasard').expect(400);

      // « Cas 2 sur 3 », puis le suivant ; après le dernier, le premier.
      expect((await lire(second.id)).position).toEqual({
        rang: 2,
        total: 3,
        suivant: { id: premier.id, slug: premier.slug, titre: premier.titre },
      });
      expect((await lire(premier.id)).position?.suivant?.id).toBe(troisieme.id);
    });

    it('cas de l’auteur et statistiques d’apprentissage, visibles de la seule personne (RG-88)', async () => {
      const valide = await casValide();
      const autre = await casValide({ titre: 'Une source inventée ?' });
      const propose = (
        await proposer(await lea(), nouveauCas({ titre: 'Un script à lancer ?' })).expect(201)
      ).body as CasApi;
      await examiner(
        await thomas(),
        propose.id,
        'REFUSE',
        'La situation manque de contexte.',
      ).expect(200);

      const mesCas = (await (await lea()).get('/api/v1/moi/cas').expect(200)).body as MesCasApi;
      expect(mesCas.elements.map((c) => [c.id, c.statut])).toEqual([
        [propose.id, 'REFUSE'],
        [autre.id, 'VALIDE'],
        [valide.id, 'VALIDE'],
      ]);
      expect(mesCas.elements[0]?.examen).toMatchObject({
        motif: 'La situation manque de contexte.',
      });

      const membre = await kofi();
      await repondre(membre, valide.id, valide.options[1]?.id).expect(200);
      await repondre(membre, autre.id, autre.options[0]?.id).expect(200);
      const stats = (await membre.get('/api/v1/moi/apprentissage').expect(200))
        .body as ApprentissageApi;
      expect(stats).toMatchObject({
        cas: { repondus: 2, reussis: 1, total: 2 },
        aRevoir: [{ id: autre.id, titre: 'Une source inventée ?', difficulte: 'DEBUTANT' }],
      });
      expect((await (await lea()).get('/api/v1/moi/apprentissage').expect(200)).body.cas).toEqual({
        repondus: 0,
        reussis: 0,
        total: 0,
      });
      expect((await visiteur().get('/api/v1/moi/apprentissage').expect(401)).body.raison).toBe(
        'connexion',
      );
    });
  });
});
