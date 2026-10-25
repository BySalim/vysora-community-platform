import type { ListeSujetsApi, MessageApi, SujetApi, TypeSujet } from '@vysora/shared';
import { and, asc, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  contenu,
  modele,
  mouvementReputation,
  outil,
  rechercheDocument,
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

describe('Forum (FORUM-01)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let leaId: number;
  let awaId: number;
  let kofiId: number;
  let moderateurId: number;
  let outilId: number;
  let outilNom: string;
  let outilSlug: string;
  let modeleId: number;
  let modeleNomCourt: string;

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
  const lea = () => agentConnecte('lea@example.com');
  const awa = () => agentConnecte('awa.sarr@example.com');
  const kofi = () => agentConnecte('kofi@example.com');
  const moderation = () => agentConnecte('thomas@example.com');

  const question = (valeurs: object = {}) => ({
    type: 'QUESTION',
    titre: 'Comment vérifier qu’un script ne supprime rien par erreur ?',
    corps:
      'Avant de lancer le script de tri écrit avec ChatGPT, comment voir les fichiers concernés ?',
    etiquettes: ['Script', 'Fichiers'],
    ...valeurs,
  });
  const publier = (agent: Agent, corps: object) =>
    agent.post('/api/v1/sujets').set('Origin', ORIGINE_SITE).send(corps);
  const repondre = (agent: Agent, sujetId: number, corps: object) =>
    agent.post(`/api/v1/sujets/${sujetId}/messages`).set('Origin', ORIGINE_SITE).send(corps);
  const accepter = (agent: Agent, messageId: number) =>
    agent.put(`/api/v1/messages/${messageId}/acceptation`).set('Origin', ORIGINE_SITE);
  const decider = (agent: Agent, id: number, action: string) =>
    agent
      .post(`/api/v1/moderation/contenus/${id}/decisions`)
      .set('Origin', ORIGINE_SITE)
      .send({ action, motif: 'Contenu examiné par la modération.' })
      .expect(201);
  const visiteur = () => request.agent(serveur()).set('X-Forwarded-For', ip);
  const lire = async (id: number, agent?: Agent) =>
    (await (agent ?? visiteur()).get(`/api/v1/sujets/${id}`).expect(200)).body as SujetApi;
  const lister = async (parametres = '') =>
    (await visiteur().get(`/api/v1/sujets${parametres}`).expect(200)).body as ListeSujetsApi;
  const reponseSimple = { corps: 'Demandez une exécution à blanc avant de lancer le tri.' };

  /** Mouvements de réputation d'un membre : [motif, points]. */
  const mouvements = async (membreId: number) =>
    (
      await contexte.db
        .select({ motif: mouvementReputation.motif, points: mouvementReputation.points })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, membreId))
        .orderBy(asc(mouvementReputation.id))
    ).map((m) => [m.motif, m.points]);
  const points = async (membreId: number) =>
    (await mouvements(membreId)).reduce((total, [, n]) => total + Number(n), 0);

  /** Sujet écrit directement en base (listes : sans limite RG-85 ni document de recherche). */
  async function sujetEnBase(
    auteurId: number,
    valeurs: Partial<typeof sujet.$inferInsert> & { date?: Date; type?: TypeSujet } = {},
  ): Promise<number> {
    const { date, type = 'QUESTION', ...colonnes } = valeurs;
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId, dateCreation: date ?? new Date() })
      .returning({ id: contenu.id });
    if (!ligne) throw new Error('Sujet non créé');
    await contexte.db.insert(sujet).values({
      id: ligne.id,
      typeSujet: type,
      titre: `Sujet de démonstration numéro ${ligne.id}`,
      slug: `sujet-${ligne.id}`,
      corps: 'Un sujet écrit pour les tests, assez long pour RG-60.',
      ...(type === 'ASTUCE'
        ? {
            exempleAvant: 'Un prompt d’origine assez long.',
            exempleApres: 'Un prompt corrigé assez long.',
          }
        : {}),
      ...colonnes,
    });
    return ligne.id;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [o] = await contexte.db
      .select({ id: outil.id, nom: outil.nom, slug: outil.slug, editeurId: outil.editeurId })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .limit(1);
    const [m] = await contexte.db
      .select({ id: modele.id, nomCourt: modele.nomCourt })
      .from(modele)
      .where(eq(modele.statut, 'DISPONIBLE'))
      .limit(1);
    if (!o || !m) throw new Error('Référentiels absents');
    ({ id: outilId, nom: outilNom, slug: outilSlug } = o);
    ({ id: modeleId, nomCourt: modeleNomCourt } = m);
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    leaId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    awaId = (await creerMembre(contexte)).id;
    kofiId = (await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' })).id;
    moderateurId = (
      await creerMembre(contexte, {
        pseudo: 'thomas-diallo',
        email: 'thomas@example.com',
        role: 'MODERATEUR',
      })
    ).id;
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('publier un sujet (F-50, F-53)', () => {
    it('publie une question visible aussitôt, dans la liste et la recherche (RG-60, RG-31)', async () => {
      const agent = await lea();
      const publie = (await publier(agent, question()).expect(201)).body as SujetApi;
      expect(publie).toMatchObject({
        type: 'QUESTION',
        slug: 'comment-verifier-qu-un-script-ne-supprime-rien-par-erreur',
        corps: question().corps,
        clinique: null,
        astuce: null,
        etat: 'OUVERT',
        etiquettes: [
          { libelle: 'Fichiers', slug: 'fichiers' },
          { libelle: 'Script', slug: 'script' },
        ],
        auteur: { pseudo: 'lea-martin', reputation: 0 },
        reponses: { total: 0, elements: [] },
        moi: { auteur: true, peutFermer: true, peutRouvrir: false },
      });

      const visiteur = await lire(publie.id);
      expect(visiteur.moi).toBeNull();
      const liste = await lister();
      expect(liste).toMatchObject({ total: 1, page: 1, pages: 1, enAttente: 1 });
      expect(liste.elements[0]).toMatchObject({
        id: publie.id,
        etat: 'OUVERT',
        enAttente: true,
        reponses: 0,
        extrait: question().corps,
        derniereActivite: { membre: { pseudo: 'lea-martin' } },
      });
      expect((await lister('?q=fichiers%20concernés')).total).toBe(1);
      expect((await lister('?q=aquarelle')).total).toBe(0);
    });

    it('refuse un sujet incomplet et une création qui n’est pas publiée (RG-60, RG-62, RG-66)', async () => {
      const agent = await lea();
      const refus = await publier(agent, {
        type: 'CLINIQUE',
        titre: 'Trop court',
        clinique: { prompt: 'Un prompt' },
        etiquettes: [],
      }).expect(400);
      expect(refus.body.erreurs).toEqual({
        titre: 'Le titre doit compter au moins 15 caractères.',
        'clinique.prompt': 'Collez le prompt que vous avez utilisé.',
        'clinique.obtenu': 'Décrivez le résultat obtenu.',
        'clinique.attendu': 'Décrivez le résultat attendu.',
        outilId: 'Indiquez l’outil utilisé.',
        etiquettes: 'Ajoutez au moins une étiquette.',
      });
      const brouillon = await creerCreation(contexte, leaId, { publiee: false });
      const lien = await publier(agent, question({ creationId: brouillon })).expect(400);
      expect(lien.body.erreurs).toEqual({ creationId: 'Choisissez une création publiée.' });
      expect(await contexte.db.$count(sujet)).toBe(0);
    });

    it('compose une clinique de ses rubriques et la relit (RG-62)', async () => {
      const agent = await lea();
      const creationId = await creerCreation(contexte, awaId);
      const publie = (
        await publier(agent, {
          type: 'CLINIQUE',
          titre: 'Mon personnage change de visage à chaque image',
          corps: 'Une série de six portraits pour une histoire illustrée.',
          clinique: {
            prompt: 'Portrait d’un jeune homme, manteau bleu, gouache.\n### Résultat obtenu',
            obtenu: 'Six visages différents d’une scène à l’autre.',
            attendu: 'Le même personnage, reconnaissable partout.',
          },
          outilId,
          modeleId,
          etiquettes: ['Portrait'],
          creationId,
        }).expect(201)
      ).body as SujetApi;
      expect(publie).toMatchObject({
        corps: 'Une série de six portraits pour une histoire illustrée.',
        clinique: {
          prompt: 'Portrait d’un jeune homme, manteau bleu, gouache.\n### Résultat obtenu',
          obtenu: 'Six visages différents d’une scène à l’autre.',
          attendu: 'Le même personnage, reconnaissable partout.',
        },
        outil: { id: outilId },
        modele: { id: modeleId },
        creation: { id: creationId, titre: 'Cité imaginaire entre ciel et mer' },
      });
      const [enregistre] = await contexte.db.select({ corps: sujet.corps }).from(sujet);
      expect(enregistre?.corps).toContain(`### Outil et modèle\n\n${outilNom} · ${modeleNomCourt}`);
      const liste = await lister(`?outil=${outilSlug}&type=CLINIQUE`);
      expect(liste.elements[0]).toMatchObject({
        extrait: 'Une série de six portraits pour une histoire illustrée.',
        modele: modeleNomCourt,
      });
    });

    it('garde les exemples d’une astuce et lui réserve « Testé, ça marche » (RG-61, RG-41)', async () => {
      const publie = (
        await publier(await lea(), {
          type: 'ASTUCE',
          titre: 'Isoler le texte exact dans un logo généré',
          corps: 'Mettre le texte exact entre guillemets règle le problème la plupart du temps.',
          exempleAvant: 'Logo pour une marque appelée Karité Doré.',
          exempleApres: 'Logo. Texte exact, en capitales : "KARITÉ DORÉ". Aucun autre texte.',
          etiquettes: ['Logo'],
        }).expect(201)
      ).body as SujetApi;
      expect(publie.astuce).toEqual({
        avant: 'Logo pour une marque appelée Karité Doré.',
        apres: 'Logo. Texte exact, en capitales : "KARITÉ DORÉ". Aucun autre texte.',
      });

      const agent = await awa();
      await agent
        .put(`/api/v1/contenus/${publie.id}/votes/TESTE_OK`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      const lu = await lire(publie.id, agent);
      expect(lu).toMatchObject({ testes: 1, moi: { teste: true, utile: false } });
      expect(await mouvements(leaId)).toEqual([['VOTE_TESTE_RECU', 5]]);
      expect((await lister('?tri=reproduits')).elements[0]).toMatchObject({ testes: 1 });

      const reponse = (await repondre(agent, publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await (
        await kofi()
      )
        .put(`/api/v1/contenus/${reponse.id}/votes/TESTE_OK`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
    });

    it('refuse un visiteur (401) et applique la limite de trois sujets par 24 heures (RG-85)', async () => {
      await request(serveur())
        .post('/api/v1/sujets')
        .set('Origin', ORIGINE_SITE)
        .send(question())
        .expect(401);
      // Lea est au niveau Curieux : trois sujets par 24 heures, celui de la veille ne compte plus.
      await sujetEnBase(leaId, { date: new Date(Date.now() - 25 * 3_600_000) });
      for (let i = 0; i < 2; i += 1) await sujetEnBase(leaId);
      const agent = await lea();
      await publier(agent, question()).expect(201);
      const refus = await publier(agent, question()).expect(429);
      expect(refus.body.code).toBe('LIMITE_ATTEINTE');
      expect(refus.body.detail).toMatch(
        /^Vous avez publié 3 sujets en 24 heures, la limite de votre niveau\. Vous pourrez en publier un autre dans /,
      );
      expect(refus.body.reessayerDans).toBeGreaterThan(0);
      // La modération n'a pas de limite.
      for (let i = 0; i < 3; i += 1) await sujetEnBase(moderateurId);
      await publier(await moderation(), question()).expect(201);
    });
  });

  describe('modifier et supprimer un sujet', () => {
    it('modifie par son auteur seul ; le type ne change plus', async () => {
      const agent = await lea();
      const publie = (await publier(agent, question()).expect(201)).body as SujetApi;
      const modifie = (
        await agent
          .put(`/api/v1/sujets/${publie.id}`)
          .set('Origin', ORIGINE_SITE)
          .send(
            question({
              titre: 'Vérifier un script de tri avant de le lancer',
              etiquettes: ['Tri'],
            }),
          )
          .expect(200)
      ).body as SujetApi;
      expect(modifie).toMatchObject({
        titre: 'Vérifier un script de tri avant de le lancer',
        slug: 'verifier-un-script-de-tri-avant-de-le-lancer',
        etiquettes: [{ libelle: 'Tri', slug: 'tri' }],
      });
      expect(modifie.dateModification).not.toBeNull();
      expect((await lister('?etiquette=tri')).total).toBe(1);
      expect((await lister('?etiquette=script')).total).toBe(0);

      const type = await agent
        .put(`/api/v1/sujets/${publie.id}`)
        .set('Origin', ORIGINE_SITE)
        .send(question({ type: 'DISCUSSION' }))
        .expect(400);
      expect(type.body.erreurs).toEqual({ type: 'Le type d’un sujet ne change plus.' });
      await (
        await awa()
      )
        .put(`/api/v1/sujets/${publie.id}`)
        .set('Origin', ORIGINE_SITE)
        .send(question())
        .expect(403);
    });

    it('supprime un sujet : introuvable, hors de la liste et de la recherche, points annulés (RG-82)', async () => {
      const agent = await lea();
      const publie = (await publier(agent, question()).expect(201)).body as SujetApi;
      const awaAgent = await awa();
      const reponse = (await repondre(awaAgent, publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await (
        await kofi()
      )
        .put(`/api/v1/contenus/${reponse.id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect(await points(awaId)).toBe(5);

      await (
        await awa()
      )
        .delete(`/api/v1/sujets/${publie.id}`)
        .set('Origin', ORIGINE_SITE)
        .expect(403);
      await agent.delete(`/api/v1/sujets/${publie.id}`).set('Origin', ORIGINE_SITE).expect(204);
      await request(serveur()).get(`/api/v1/sujets/${publie.id}`).expect(404);
      expect((await lister()).total).toBe(0);
      expect(await contexte.db.$count(rechercheDocument)).toBe(0);
      expect(await points(awaId)).toBe(0);
      await repondre(awaAgent, publie.id, reponseSimple).expect(404);
    });
  });

  describe('répondre (F-51)', () => {
    it('publie une réponse avec un prompt proposé et met la liste à jour (RG-64)', async () => {
      const publie = (await publier(await lea(), question()).expect(201)).body as SujetApi;
      const agent = await awa();
      const trop = await repondre(agent, publie.id, { corps: 'Trop court.' }).expect(400);
      expect(trop.body.erreurs).toEqual({
        corps: 'Écrivez au moins 20 caractères pour que votre réponse soit utile.',
      });
      const reponse = (
        await repondre(agent, publie.id, {
          ...reponseSimple,
          prompt: 'Ajoute une option --essai active par défaut.',
        }).expect(201)
      ).body as MessageApi;
      expect(reponse).toMatchObject({
        corps: reponseSimple.corps,
        prompt: 'Ajoute une option --essai active par défaut.',
        auteur: { pseudo: 'awa-sarr' },
        acceptee: null,
        moi: { auteur: true },
      });

      const lu = await lire(publie.id);
      expect(lu.reponses.elements).toHaveLength(1);
      const [element] = (await lister()).elements;
      expect(element).toMatchObject({
        reponses: 1,
        enAttente: false,
        derniereActivite: { membre: { pseudo: 'awa-sarr' } },
      });
      expect((await lister('?avecPrompt=true')).total).toBe(1);
      expect((await lister('?sansReponse=true')).total).toBe(0);
      expect((await lister('?membre=awa-sarr')).total).toBe(1);
      expect((await lister('?membre=kofi-mensah')).total).toBe(0);

      const modifiee = (
        await agent
          .patch(`/api/v1/messages/${reponse.id}`)
          .set('Origin', ORIGINE_SITE)
          .send({ corps: 'Demandez une exécution à blanc, puis relisez la liste.' })
          .expect(200)
      ).body as MessageApi;
      expect(modifiee).toMatchObject({ prompt: null });
      expect(modifiee.dateModification).not.toBeNull();
      await (
        await kofi()
      )
        .patch(`/api/v1/messages/${reponse.id}`)
        .set('Origin', ORIGINE_SITE)
        .send(reponseSimple)
        .expect(403);
    });

    it('applique la limite des réponses et commentaires par 24 heures (RG-85)', async () => {
      const id = await sujetEnBase(leaId);
      await contexte.db
        .insert(contenu)
        .values(
          Array.from({ length: 20 }, () => ({
            typeContenu: 'COMMENTAIRE' as const,
            auteurId: awaId,
          })),
        );
      const refus = await repondre(await awa(), id, reponseSimple).expect(429);
      expect(refus.body.detail).toMatch(
        /^Vous avez publié 20 réponses et commentaires en 24 heures, la limite de votre niveau\./,
      );
    });
  });

  describe('réponse acceptée (F-52)', () => {
    it('accepte, transfère et retire les points de l’acceptation (RG-63, RG-80, RG-82)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const premiere = (await repondre(await awa(), publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      const seconde = (
        await repondre(await kofi(), publie.id, {
          corps: 'Remplacez toute suppression par un déplacement vers une corbeille.',
        }).expect(201)
      ).body as MessageApi;
      const sienne = (
        await repondre(auteur, publie.id, { corps: 'Merci, je teste la méthode ce soir.' }).expect(
          201,
        )
      ).body as MessageApi;

      const resolu = (await accepter(auteur, premiere.id).expect(200)).body as SujetApi;
      expect(resolu.etat).toBe('RESOLU');
      expect(resolu.reponses.elements.find((r) => r.id === premiere.id)?.acceptee).not.toBeNull();
      expect(await mouvements(awaId)).toEqual([['REPONSE_ACCEPTEE', 15]]);
      expect(await mouvements(leaId)).toEqual([['ACCEPTATION_REPONSE', 2]]);
      const [element] = (await lister()).elements;
      expect(element).toMatchObject({
        etat: 'RESOLU',
        solution: { auteur: { pseudo: 'awa-sarr' } },
      });
      expect((await lister('?sansReponseAcceptee=true')).total).toBe(0);
      // Accepter de nouveau la même réponse ne change rien.
      await accepter(auteur, premiere.id).expect(200);
      expect(await mouvements(awaId)).toHaveLength(1);

      // Une autre réponse acceptée : la précédente perd son statut, les points sont transférés.
      await accepter(auteur, seconde.id).expect(200);
      expect(await points(awaId)).toBe(0);
      expect(await points(kofiId)).toBe(15);
      expect(await points(leaId)).toBe(2);

      expect((await accepter(auteur, sienne.id).expect(409)).body.detail).toBe(
        'Choisissez la réponse d’un autre membre.',
      );
      await accepter(await awa(), seconde.id).expect(403);

      const retire = (
        await auteur
          .delete(`/api/v1/messages/${seconde.id}/acceptation`)
          .set('Origin', ORIGINE_SITE)
          .expect(200)
      ).body as SujetApi;
      expect(retire.etat).toBe('OUVERT');
      expect(await points(kofiId)).toBe(0);
      expect(await points(leaId)).toBe(0);
      await auteur
        .delete(`/api/v1/messages/${seconde.id}/acceptation`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
    });

    it('réserve l’acceptation aux questions et aux cliniques (RG-63)', async () => {
      const auteur = await lea();
      const discussion = (await publier(auteur, question({ type: 'DISCUSSION' })).expect(201))
        .body as SujetApi;
      const reponse = (await repondre(await awa(), discussion.id, reponseSimple).expect(201))
        .body as MessageApi;
      expect((await accepter(auteur, reponse.id).expect(409)).body.detail).toBe(
        'Seules les questions et les cliniques du prompt ont une réponse acceptée.',
      );
    });

    it('retire l’acceptation d’une réponse supprimée par son auteur (RG-63, RG-82)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const agent = await awa();
      const reponse = (await repondre(agent, publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await accepter(auteur, reponse.id).expect(200);
      await agent.delete(`/api/v1/messages/${reponse.id}`).set('Origin', ORIGINE_SITE).expect(204);
      const lu = await lire(publie.id);
      expect(lu).toMatchObject({ etat: 'OUVERT', reponses: { total: 0 } });
      const [ligne] = await contexte.db.select({ accepte: sujet.messageAccepteId }).from(sujet);
      expect(ligne?.accepte).toBeNull();
      expect(await points(awaId)).toBe(0);
      expect(await points(leaId)).toBe(0);
    });
  });

  describe('fermer et rouvrir (F-55)', () => {
    it('ferme par l’auteur : plus de réponse ni d’acceptation, réouverture par l’auteur (RG-65)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const reponse = (await repondre(await awa(), publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await (
        await kofi()
      )
        .put(`/api/v1/sujets/${publie.id}/fermeture`)
        .set('Origin', ORIGINE_SITE)
        .expect(403);
      const ferme = (
        await auteur
          .put(`/api/v1/sujets/${publie.id}/fermeture`)
          .set('Origin', ORIGINE_SITE)
          .expect(200)
      ).body as SujetApi;
      expect(ferme).toMatchObject({
        etat: 'FERME',
        fermeture: { par: { pseudo: 'lea-martin' } },
        moi: { peutFermer: false, peutRouvrir: true },
      });
      expect((await repondre(await kofi(), publie.id, reponseSimple).expect(409)).body.detail).toBe(
        'Ce sujet est fermé : il n’accepte plus de réponses.',
      );
      await accepter(auteur, reponse.id).expect(409);
      expect((await lister('?enAttente=true')).total).toBe(0);

      const rouvert = (
        await auteur
          .delete(`/api/v1/sujets/${publie.id}/fermeture`)
          .set('Origin', ORIGINE_SITE)
          .expect(200)
      ).body as SujetApi;
      expect(rouvert).toMatchObject({ etat: 'OUVERT', fermeture: null });
    });

    it('un sujet fermé par la modération ne se rouvre que par elle (RG-65, CI-22)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const equipe = await moderation();
      await equipe
        .put(`/api/v1/sujets/${publie.id}/fermeture`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect((await lire(publie.id, auteur)).moi).toMatchObject({ peutRouvrir: false });
      expect(
        (
          await auteur
            .delete(`/api/v1/sujets/${publie.id}/fermeture`)
            .set('Origin', ORIGINE_SITE)
            .expect(403)
        ).body.detail,
      ).toBe('Ce sujet a été fermé par la modération : elle seule peut le rouvrir.');
      await equipe
        .delete(`/api/v1/sujets/${publie.id}/fermeture`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      expect((await lire(publie.id)).etat).toBe('OUVERT');
    });
  });

  describe('modération, signalements et enregistrements', () => {
    it('masque une réponse acceptée : présentée à son auteur seul, points annulés puis rétablis (RG-30, RG-82)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const agent = await awa();
      const reponse = (await repondre(agent, publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await accepter(auteur, reponse.id).expect(200);

      const equipe = await moderation();
      await decider(equipe, reponse.id, 'MASQUER');
      expect(await lire(publie.id)).toMatchObject({ etat: 'OUVERT', reponses: { total: 0 } });
      const vueParSonAuteur = await lire(publie.id, agent);
      expect(vueParSonAuteur.reponses.elements[0]).toMatchObject({
        id: reponse.id,
        masquee: true,
        acceptee: null,
        masquage: { motif: 'Contenu examiné par la modération.' },
      });
      expect((await lire(publie.id, equipe)).reponses.total).toBe(1);
      expect(await points(awaId)).toBe(0);
      expect(await points(leaId)).toBe(0);

      await decider(equipe, reponse.id, 'RETABLIR');
      expect((await lire(publie.id)).etat).toBe('RESOLU');
      expect(await points(awaId)).toBe(15);
      expect(await points(leaId)).toBe(2);
    });

    it('ne rend pas les points d’une acceptation que l’auteur a reportée sur une autre réponse (RG-63, RG-82)', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const premiere = (await repondre(await awa(), publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      const seconde = (await repondre(await kofi(), publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      await accepter(auteur, premiere.id).expect(200);
      const equipe = await moderation();
      await decider(equipe, premiere.id, 'MASQUER');
      await accepter(auteur, seconde.id).expect(200);
      await decider(equipe, premiere.id, 'RETABLIR');
      expect(await points(awaId)).toBe(0);
      expect(await points(kofiId)).toBe(15);
      expect(await points(leaId)).toBe(2);
      const lu = await lire(publie.id);
      expect(lu.reponses.elements.map((r) => [r.id, r.acceptee !== null])).toEqual([
        [premiere.id, false],
        [seconde.id, true],
      ]);
    });

    it('masque et rétablit un sujet : hors de la liste et de la recherche, puis de retour', async () => {
      const auteur = await lea();
      const publie = (await publier(auteur, question()).expect(201)).body as SujetApi;
      const equipe = await moderation();
      await decider(equipe, publie.id, 'MASQUER');
      await request(serveur()).get(`/api/v1/sujets/${publie.id}`).expect(404);
      expect(await lire(publie.id, auteur)).toMatchObject({
        masquee: true,
        moi: { peutFermer: false },
      });
      expect((await lister()).total).toBe(0);
      expect(await contexte.db.$count(rechercheDocument)).toBe(0);
      // Modifié par son auteur, il reste masqué et hors de la recherche.
      await auteur
        .put(`/api/v1/sujets/${publie.id}`)
        .set('Origin', ORIGINE_SITE)
        .send(question())
        .expect(200);
      expect(await contexte.db.$count(rechercheDocument)).toBe(0);

      await decider(equipe, publie.id, 'RETABLIR');
      expect((await lister('?q=script')).total).toBe(1);
    });

    it('signale et enregistre un sujet, signale une réponse (RG-100, RG-45)', async () => {
      const publie = (await publier(await lea(), question()).expect(201)).body as SujetApi;
      const reponse = (await repondre(await awa(), publie.id, reponseSimple).expect(201))
        .body as MessageApi;
      const agent = await kofi();
      await agent
        .post(`/api/v1/contenus/${reponse.id}/signalements`)
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .send({ motif: 'HORS_SUJET' })
        .expect(201);
      await agent
        .put(`/api/v1/contenus/${publie.id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await agent
        .put(`/api/v1/contenus/${reponse.id}/enregistrement`)
        .set('Origin', ORIGINE_SITE)
        .expect(409);
      await agent
        .put(`/api/v1/contenus/${reponse.id}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      const lu = await lire(publie.id, agent);
      expect(lu.moi).toMatchObject({ enregistre: true, signalementOuvert: false });
      expect(lu.reponses.elements[0]).toMatchObject({
        utiles: 1,
        moi: { utile: true, signalementOuvert: true, auteur: false },
      });
      const [enregistre] = (await agent.get('/api/v1/moi/enregistrements').expect(200)).body
        .elements;
      expect(enregistre).toMatchObject({ genre: 'SUJET', reponses: 1, etat: 'OUVERT' });
    });
  });

  describe('liste des sujets (EC-06)', () => {
    it('filtre par type, étiquette absente, membre et attente ; trie par votes et par activité', async () => {
      const ancienne = await sujetEnBase(leaId, { date: new Date(Date.now() - 3 * 86_400_000) });
      const astuce = await sujetEnBase(awaId, {
        type: 'ASTUCE',
        date: new Date(Date.now() - 2 * 86_400_000),
      });
      const recente = await sujetEnBase(leaId, { type: 'DISCUSSION' });
      await (
        await kofi()
      )
        .put(`/api/v1/contenus/${astuce}/votes/UTILE`)
        .set('Origin', ORIGINE_SITE)
        .expect(200);
      await repondre(await kofi(), ancienne, reponseSimple).expect(201);

      const ids = async (parametres: string) =>
        (await lister(parametres)).elements.map((s) => s.id);
      expect(await ids('')).toEqual([recente, astuce, ancienne]);
      expect(await ids('?tri=anciens')).toEqual([ancienne, astuce, recente]);
      expect(await ids('?tri=actifs')).toEqual([ancienne, recente, astuce]);
      expect((await ids('?tri=utiles'))[0]).toBe(astuce);
      expect(await ids('?type=ASTUCE,DISCUSSION')).toEqual([recente, astuce]);
      expect(await ids('?membre=kofi-mensah')).toEqual([ancienne]);
      expect(await ids('?enAttente=true&tri=anciens')).toEqual([astuce, recente]);
      expect(await ids('?etiquette=inconnue')).toEqual([]);
      const refus = await request(serveur()).get('/api/v1/sujets?type=SONDAGE').expect(400);
      expect(refus.body.erreurs).toEqual({ 'type.0': 'Ce type de sujet n’existe pas.' });
    });

    it('pagine par dix et ramène une page trop lointaine à la dernière', async () => {
      for (let i = 0; i < 12; i += 1)
        await sujetEnBase(leaId, { date: new Date(Date.now() - i * 60_000) });
      const premiere = await lister();
      expect(premiere).toMatchObject({ total: 12, page: 1, pages: 2, enAttente: 12 });
      expect(premiere.elements).toHaveLength(10);
      const lointaine = await lister('?page=9');
      expect(lointaine).toMatchObject({ page: 2 });
      expect(lointaine.elements).toHaveLength(2);
    });

    it('ne présente ni sujet masqué ni réponse masquée dans les chiffres', async () => {
      const id = await sujetEnBase(leaId);
      const masque = await sujetEnBase(leaId);
      await contexte.db.update(contenu).set({ statut: 'MASQUE' }).where(eq(contenu.id, masque));
      const reponse = (await repondre(await awa(), id, reponseSimple).expect(201))
        .body as MessageApi;
      await contexte.db
        .update(contenu)
        .set({ statut: 'MASQUE' })
        .where(and(eq(contenu.id, reponse.id)));
      const liste = await lister();
      expect(liste.total).toBe(1);
      expect(liste.elements[0]).toMatchObject({ id, reponses: 0, enAttente: true });
    });
  });
});
