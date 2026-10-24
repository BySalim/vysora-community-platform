import type { ContenuCreationSaisi, CreationFicheApi, MediaApi } from '@vysora/shared';
import { and, eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import request from 'supertest';
import {
  categorie,
  contenu,
  creation,
  echange,
  licence,
  media,
  mouvementReputation,
  outil,
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

const png = () =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: '#1d4ed8' } })
    .png()
    .toBuffer();

describe('Écriture des créations (CREA-05, F-10 à F-17)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let outilId: number;
  let autreOutilId: number;
  let categorieId: number;
  let licenceParDefaut: string;
  let awaId: number;

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
  const creer = (agent: Agent, corps: ContenuCreationSaisi) =>
    envoyer(agent, 'post', '/creations', corps);
  const enregistrer = (agent: Agent, id: number, corps: ContenuCreationSaisi) =>
    envoyer(agent, 'put', `/creations/${id}`, corps);
  const publier = (agent: Agent, id: number, confirmationDonnees = true) =>
    envoyer(agent, 'post', `/creations/${id}/publication`, { confirmationDonnees });
  const televerser = async (agent: Agent, texteAlternatif?: string): Promise<MediaApi> =>
    (
      await agent
        .post('/api/v1/medias')
        .set('Origin', ORIGINE_SITE)
        .set('X-Forwarded-For', ip)
        .field(texteAlternatif ? { texteAlternatif } : {})
        .attach('fichier', await png(), { filename: 'affiche.png', contentType: 'image/png' })
        .expect(201)
    ).body as MediaApi;

  /** « 1 prompt » complet : publiable tel quel. */
  const unPrompt = (): ContenuCreationSaisi => ({
    type: 'UN_PROMPT',
    titre: 'Affiche typographique de Gorée',
    objectif: 'Une affiche lisible, construite autour du nom du lieu.',
    categorieId,
    etiquettes: ['Affiche', 'Voyage'],
    etapes: [
      {
        configurations: [{ outilId }],
        echanges: [
          {
            prompt: 'Affiche typographique de Gorée, bleu profond et blanc.',
            reponse: 'Voici une affiche verticale, le nom du lieu en grand.',
          },
        ],
        moments: [
          {
            type: 'DECOUVERTE',
            explication: 'Le nom du lieu devient le centre de la composition.',
            echange: 0,
          },
        ],
      },
    ],
  });

  const recit = 'Ce que j’ai fait à cette étape, et pourquoi, en cinquante caractères au moins.';

  /** Points de réputation donnés directement (niveau de l'auteur). */
  const donnerPoints = (membreId: number, points: number) =>
    contexte.db
      .insert(mouvementReputation)
      .values({ beneficiaireId: membreId, points, motif: 'VOTE_UTILE_RECU' });

  const sommePoints = async (membreId: number) =>
    (
      await contexte.db.execute<{ total: number }>(
        sql`select coalesce(sum(points), 0)::int as total from mouvement_reputation where beneficiaire_id = ${membreId}`,
      )
    ).rows[0]?.total;

  const indexee = async (id: number) =>
    (
      await contexte.db.execute<{ n: number }>(
        sql`select count(*)::int as n from recherche_document where contenu_id = ${id} and vecteur @@ plainto_tsquery('vysora_fr', 'goree')`,
      )
    ).rows[0]?.n === 1;

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const outils = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .orderBy(outil.id)
      .limit(2);
    const [cat] = await contexte.db
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.estActive, true))
      .limit(1);
    const [lic] = await contexte.db
      .select({ code: licence.code })
      .from(licence)
      .where(eq(licence.estParDefaut, true));
    if (!outils[1] || !cat || !lic) throw new Error('Référentiels absents');
    [outilId, autreOutilId, categorieId, licenceParDefaut] = [
      outils[0]!.id,
      outils[1].id,
      cat.id,
      lic.code,
    ];
  });

  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    awaId = (await creerMembre(contexte)).id;
    await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'mouvement_reputation');
    await contexte.app.close();
  });

  describe('brouillon (F-16)', () => {
    it('enregistre un brouillon incomplet, visible de son seul auteur, sous la licence par défaut (RG-30, F-17)', async () => {
      const awa = await agentConnecte();
      const reponse = await creer(awa, { type: 'ITERATION', titre: 'Mon brouillon' }).expect(201);
      const fiche = reponse.body as CreationFicheApi;
      expect(fiche).toMatchObject({
        type: 'ITERATION',
        statut: 'BROUILLON',
        titre: 'Mon brouillon',
        slug: 'mon-brouillon',
        datePublication: null,
        licence: { code: licenceParDefaut },
        moi: { auteur: true },
      });
      expect(fiche.dateModification).not.toBeNull();
      await (
        await agentConnecte('lea@example.com')
      )
        .get(`/api/v1/creations/${fiche.id}`)
        .expect(404);
      await request(serveur()).get(`/api/v1/creations/${fiche.id}`).expect(404);
    });

    it('réserve l’écriture aux comptes actifs : visiteur 401, adresse non vérifiée 403', async () => {
      await creer(request.agent(serveur()), unPrompt()).expect(401);
      await creerMembre(contexte, {
        pseudo: 'kofi',
        email: 'kofi@example.com',
        emailVerifie: false,
      });
      const refus = await creer(await agentConnecte('kofi@example.com'), unPrompt()).expect(403);
      expect(refus.body.raison).toBe('email');
      expect(await contexte.db.$count(creation)).toBe(0);
    });

    it('enregistre le contenu complet et garde les étapes et les échanges désignés', async () => {
      const awa = await agentConnecte();
      const [resultat, jointe, retiree] = [
        await televerser(awa, 'Écran d’accueil de l’application'),
        await televerser(awa, 'Première maquette'),
        await televerser(awa, 'Maquette abandonnée'),
      ];
      const premier: ContenuCreationSaisi = {
        type: 'PROJET',
        titre: 'Réservation de terrains de foot à Ngor',
        objectif: 'Réserver un terrain en trois gestes, sans double réservation.',
        categorieId,
        formatResultat: 'Application web',
        aAdapter: ['Les horaires', ''],
        etiquettes: ['Réservation', 'réservation', 'Sport'],
        instructionsAgent: true,
        resultat: { nature: 'CODE', texte: 'const terrains = 2;', nom: 'terrains.js' },
        images: [resultat.id, retiree.id],
        liens: [{ type: 'DEMO', url: 'https://ngor.example/demo', libelle: 'Démo' }],
        etapes: [
          {
            titre: 'Cadrer le besoin',
            recit,
            configurations: [{ outilId }],
            echanges: [{ prompt: 'Liste les cas de double réservation.', images: [jointe.id] }],
            moments: [],
          },
          {
            titre: 'Construire l’écran',
            recit,
            configurations: [
              { outilId },
              { outilId: autreOutilId, modeleNonReference: 'Version maison' },
            ],
            echanges: [
              {
                prompt: 'Écris la page de réservation.',
                configuration: 1,
                nbEssais: 3,
                modeSelection: 'MEILLEUR_ESSAI',
              },
              { prompt: 'Ajoute la confirmation.', configuration: 0 },
            ],
            moments: [
              {
                type: 'CORRECTION',
                explication: 'La confirmation vérifiait trop tard la disponibilité.',
                echange: 1,
              },
            ],
          },
        ],
      };
      const fiche = (await creer(awa, premier).expect(201)).body as CreationFicheApi;
      expect(fiche).toMatchObject({
        type: 'PROJET',
        formatResultat: 'Application web',
        aAdapter: ['Les horaires'],
        avertissementAgent: 'AUTEUR',
        resultat: { nature: 'CODE', texte: 'const terrains = 2;', nom: 'terrains.js' },
        etiquettes: [{ libelle: 'Réservation' }, { libelle: 'Sport' }],
        liens: [{ type: 'DEMO', url: 'https://ngor.example/demo', libelle: 'Démo' }],
      });
      expect(fiche.images.map((i) => i.id)).toEqual([resultat.id, retiree.id]);
      const [cadrer, construire] = fiche.etapes;
      expect(cadrer?.echanges[0]?.images.map((i) => i.id)).toEqual([jointe.id]);
      // RG-14 : chaque échange désigne sa configuration ; RG-15 : le moment vise le bon échange.
      const [page, confirmation] = construire?.echanges ?? [];
      expect(page?.configurationId).toBe(construire?.configurations[1]?.id);
      expect(page).toMatchObject({ nbEssais: 3, modeSelection: 'MEILLEUR_ESSAI' });
      expect(construire?.configurations[1]).toMatchObject({ modeleNonReference: 'Version maison' });
      expect(construire?.moments[0]?.echangeId).toBe(confirmation?.id);

      // Second enregistrement : étapes inversées, un échange retiré, un autre ajouté, une image retirée.
      const second: ContenuCreationSaisi = {
        ...premier,
        titre: 'Réservation des terrains de Ngor',
        etiquettes: ['Football'],
        instructionsAgent: false,
        images: [resultat.id],
        etapes: [
          {
            id: construire?.id,
            titre: 'Construire l’écran',
            recit,
            configurations: [{ outilId }],
            echanges: [
              { id: confirmation?.id, prompt: 'Ajoute la confirmation et le rappel.' },
              { prompt: 'Affiche les créneaux pris en gris.' },
            ],
          },
          {
            id: cadrer?.id,
            titre: 'Cadrer le besoin',
            recit,
            configurations: [{ outilId }],
            echanges: [
              { id: cadrer?.echanges[0]?.id, prompt: 'Liste les cas.', images: [jointe.id] },
            ],
          },
        ],
      };
      const relue = (await enregistrer(awa, fiche.id, second).expect(200)).body as CreationFicheApi;
      expect(relue).toMatchObject({
        slug: 'reservation-des-terrains-de-ngor',
        avertissementAgent: 'AUCUN',
        etiquettes: [{ libelle: 'Football' }],
      });
      expect(relue.etapes.map((e) => e.id)).toEqual([construire?.id, cadrer?.id]);
      expect(relue.etapes[0]?.echanges.map((x) => x.id)[0]).toBe(confirmation?.id);
      expect(relue.etapes[0]?.echanges[1]?.configurationId).toBe(
        relue.etapes[0]?.configurations[0]?.id,
      );
      expect(relue.etapes[1]?.echanges[0]?.images.map((i) => i.id)).toEqual([jointe.id]);
      expect(await contexte.db.$count(echange, eq(echange.id, page?.id ?? 0))).toBe(0);
      // L'image retirée n'est plus rattachée : le nettoyage quotidien la supprimera (MEDIA-01).
      const [libre] = await contexte.db.select().from(media).where(eq(media.id, retiree.id));
      expect([libre?.contenuId, libre?.echangeId]).toEqual([null, null]);
    });

    it('refuse les images d’un autre membre et les éléments inconnus (CI-02, RG-14)', async () => {
      const lea = await agentConnecte('lea@example.com');
      const imageDeLea = await televerser(lea, 'Image de Léa');
      const awa = await agentConnecte();
      const refus = await creer(awa, {
        ...unPrompt(),
        categorieId: 999_999,
        images: [imageDeLea.id],
        etapes: [
          { id: 999_999, configurations: [{ outilId: 999_999 }], echanges: [{ id: 999_998 }] },
        ],
      }).expect(400);
      expect(refus.body.erreurs).toEqual({
        categorieId: 'Choisissez une catégorie de la liste.',
        'etapes.0.configurations.0.outilId': 'Choisissez un outil de la liste.',
        'images.0': 'Cette image est introuvable.',
        'etapes.0.id': 'Cette étape est introuvable.',
        'etapes.0.echanges.0.id': 'Ce prompt est introuvable.',
      });
      expect(await contexte.db.$count(creation)).toBe(0);
    });

    it('refuse ce qu’aucun brouillon ne peut contenir (RG-10, RG-15, RG-16)', async () => {
      const awa = await agentConnecte();
      const refus = await creer(awa, {
        ...unPrompt(),
        titre: 'x'.repeat(121),
        liens: Array.from({ length: 11 }, (_, i) => ({
          type: 'DEMO' as const,
          url: `https://exemple.test/${i}`,
        })),
        etapes: [
          {
            configurations: [{ outilId }],
            echanges: [{ prompt: 'Un prompt' }],
            moments: [
              { type: 'DECOUVERTE', echange: 0 },
              { type: 'REFUS', echange: 0 },
            ],
          },
        ],
      }).expect(400);
      expect(refus.body.erreurs).toEqual({
        titre: 'Le titre compte 120 caractères au plus.',
        liens: 'Gardez 10 liens au plus.',
        'etapes.0.moments.1.echange': 'Un prompt porte un seul moment clé.',
      });
    });
  });

  describe('publication (RG-17)', () => {
    it('publie un brouillon complet, la case cochée, et l’ajoute à la recherche (RG-31)', async () => {
      const awa = await agentConnecte();
      const { id } = (await creer(awa, unPrompt()).expect(201)).body as CreationFicheApi;
      const sansCase = await publier(awa, id, false).expect(400);
      expect(sansCase.body.erreurs).toEqual({
        confirmationDonnees: 'Cochez cette case pour publier.',
      });

      const fiche = (await publier(awa, id).expect(200)).body as CreationFicheApi;
      expect(fiche.statut).toBe('PUBLIEE');
      expect(fiche.datePublication).not.toBeNull();
      const [ligne] = await contexte.db.select().from(creation).where(eq(creation.id, id));
      expect(ligne?.dateConfirmationDonnees).toEqual(new Date(fiche.datePublication ?? ''));
      expect(await indexee(id)).toBe(true);
      await (await agentConnecte('lea@example.com')).get(`/api/v1/creations/${id}`).expect(200);
      await publier(awa, id).expect(409);
    });

    it('refuse un brouillon incomplet, champ par champ, avec les messages de l’éditeur (RG-10)', async () => {
      const awa = await agentConnecte();
      const { id } = (await creer(awa, { type: 'ITERATION', titre: 'Affiche' }).expect(201))
        .body as CreationFicheApi;
      const refus = await publier(awa, id).expect(400);
      expect(refus.body).toMatchObject({
        code: 'VALIDATION',
        detail: '5 points à compléter avant de publier.',
        erreurs: {
          titre: 'Le titre doit compter au moins 10 caractères (7 pour l’instant).',
          objectif: 'Dites ce que vous vouliez obtenir.',
          resultat: 'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.',
          etapes: 'Ajoutez au moins un prompt, avec l’outil utilisé.',
          categorieId: 'Choisissez une catégorie.',
        },
      });
      expect(Object.keys(refus.body.erreurs)).toEqual([
        'titre',
        'objectif',
        'resultat',
        'etapes',
        'categorieId',
      ]);
    });

    it('exige le résultat (décision du 24 octobre) et la description de chaque image (RG-11, ENF-01)', async () => {
      const awa = await agentConnecte();
      const sansReponse = unPrompt();
      delete sansReponse.etapes?.[0]?.echanges?.[0]?.reponse;
      const { id } = (await creer(awa, sansReponse).expect(201)).body as CreationFicheApi;
      expect((await publier(awa, id).expect(400)).body.erreurs).toEqual({
        resultat: 'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.',
      });

      const image = await televerser(awa);
      await enregistrer(awa, id, { ...sansReponse, images: [image.id] }).expect(200);
      expect((await publier(awa, id).expect(400)).body.erreurs).toEqual({
        'images.0.texteAlternatif':
          'Décrivez l’image du résultat pour les personnes qui ne la voient pas.',
      });
      await awa
        .patch(`/api/v1/medias/${image.id}`)
        .set('Origin', ORIGINE_SITE)
        .send({ texteAlternatif: 'Affiche bleue de Gorée' })
        .expect(200);
      await publier(awa, id).expect(200);
    });

    it('contrôle la structure de chaque type (RG-11 à RG-15)', async () => {
      const awa = await agentConnecte();
      const erreurs = async (saisie: ContenuCreationSaisi) => {
        const { id } = (await creer(awa, saisie).expect(201)).body as CreationFicheApi;
        return (await publier(awa, id).expect(400)).body.erreurs as Record<string, string>;
      };
      const base = unPrompt();
      const etape = base.etapes?.[0];
      // RG-11 : un seul prompt.
      expect(
        await erreurs({
          ...base,
          etapes: [
            {
              ...etape,
              echanges: [...(etape?.echanges ?? []), { prompt: 'Encore', reponse: 'Oui' }],
            },
          ],
        }),
      ).toEqual({ etapes: 'Une création « 1 prompt » compte un seul prompt.' });
      // RG-12 : au moins deux prompts.
      expect(await erreurs({ ...base, type: 'ITERATION' })).toEqual({
        'etapes.0.echanges': 'Une itération compte au moins deux prompts.',
      });
      // RG-13 et RG-14 : étapes titrées et racontées ; outil de chaque prompt d'une étape à plusieurs outils.
      expect(
        await erreurs({
          ...base,
          type: 'PROJET',
          liens: [{ type: 'DEPOT_CODE', url: 'https://depot.example/projet' }],
          etapes: [
            {
              titre: 'Cadrer',
              recit: 'Trop court.',
              configurations: [{ outilId }],
              echanges: [{ prompt: 'Un' }],
            },
            {
              titre: 'Construire la page',
              recit,
              configurations: [{ outilId }, { outilId: autreOutilId }],
              echanges: [{ prompt: 'Deux' }],
            },
          ],
        }),
      ).toEqual({
        'etapes.0.recit': 'Racontez l’étape 1 en 50 caractères au moins (11 pour l’instant).',
        'etapes.1.echanges.0.configuration': 'Choisissez l’outil du prompt 2.',
      });
      // RG-15 : explication du moment clé.
      expect(
        await erreurs({
          ...base,
          etapes: [
            { ...etape, moments: [{ type: 'REFUS', explication: 'Trop bref', echange: 0 }] },
          ],
        }),
      ).toEqual({
        'etapes.0.moments.0.explication':
          'Prompt 1 : expliquez le moment clé en 20 caractères au moins.',
      });
    });

    it('limite les liens à 2 au niveau Curieux, 10 ensuite (RG-85, RG-16)', async () => {
      const awa = await agentConnecte();
      const liens = Array.from({ length: 3 }, (_, i) => ({
        type: 'DEMO' as const,
        url: `https://exemple.test/${i}`,
      }));
      const { id } = (await creer(awa, { ...unPrompt(), liens }).expect(201))
        .body as CreationFicheApi;
      expect((await publier(awa, id).expect(400)).body.erreurs).toEqual({
        liens: 'Gardez 2 liens au plus à votre niveau.',
      });
      await donnerPoints(awaId, 50); // Apprenti
      await publier(awa, id).expect(200);
    });

    it('limite les publications d’un membre Curieux à 3 par 24 heures (RG-85)', async () => {
      const awa = await agentConnecte();
      for (let i = 0; i < 3; i += 1) await creerCreation(contexte, awaId);
      const { id } = (await creer(awa, unPrompt()).expect(201)).body as CreationFicheApi;
      const refus = await publier(awa, id).expect(429);
      expect(refus.body.code).toBe('LIMITE_ATTEINTE');
      expect(refus.body.detail).toMatch(
        /^Limite de 3 publications par 24 heures atteinte\. Vous pourrez publier dans 2[34] h( \d+ min)? ; votre brouillon reste enregistré\.$/,
      );
      expect(Number(refus.headers['retry-after'])).toBeGreaterThan(23 * 3600);
      // Au niveau Expert, la limite disparaît.
      await donnerPoints(awaId, 1500);
      await publier(awa, id).expect(200);
    });
  });

  describe('modification, dépublication, suppression (RG-17 à RG-19)', () => {
    async function publiee(agent: Agent): Promise<CreationFicheApi> {
      const { id } = (await creer(agent, unPrompt()).expect(201)).body as CreationFicheApi;
      return (await publier(agent, id).expect(200)).body as CreationFicheApi;
    }

    it('publie aussitôt la modification d’une création publiée, aux mêmes conditions, sans changer son type (RG-18)', async () => {
      const awa = await agentConnecte();
      const fiche = await publiee(awa);
      const modifiee = {
        ...unPrompt(),
        objectif: 'Une affiche lisible de l’île de Gorée, autour de son nom.',
      };

      expect(
        (await enregistrer(awa, fiche.id, { ...modifiee, type: 'ITERATION' }).expect(400)).body
          .erreurs,
      ).toEqual({
        type: 'Le type d’une création publiée ne change plus.',
      });
      expect(
        (
          await enregistrer(awa, fiche.id, {
            ...modifiee,
            titre: 'Court',
            confirmationDonnees: true,
          }).expect(400)
        ).body.erreurs,
      ).toEqual({
        titre: 'Le titre doit compter au moins 10 caractères (5 pour l’instant).',
      });
      expect((await enregistrer(awa, fiche.id, modifiee).expect(400)).body.erreurs).toEqual({
        confirmationDonnees: 'Cochez cette case pour publier.',
      });
      // Les refus n'ont rien changé.
      const intacte = (await awa.get(`/api/v1/creations/${fiche.id}`).expect(200))
        .body as CreationFicheApi;
      expect([intacte.titre, intacte.objectif]).toEqual([fiche.titre, fiche.objectif]);

      const relue = (
        await enregistrer(awa, fiche.id, { ...modifiee, confirmationDonnees: true }).expect(200)
      ).body as CreationFicheApi;
      expect(relue).toMatchObject({ statut: 'PUBLIEE', objectif: modifiee.objectif });
      expect(new Date(relue.dateModification ?? 0) >= new Date(relue.datePublication ?? 0)).toBe(
        true,
      );
      expect(await indexee(fiche.id)).toBe(true);
    });

    it('dépublie : la création redevient un brouillon que les autres ne voient plus (RG-17)', async () => {
      const awa = await agentConnecte();
      const fiche = await publiee(awa);
      const lea = await agentConnecte('lea@example.com');
      await envoyer(lea, 'post', `/creations/${fiche.id}/commentaires`, {
        corps: 'Merci pour le prompt.',
      }).expect(201);

      const brouillon = (
        await envoyer(awa, 'delete', `/creations/${fiche.id}/publication`).expect(200)
      ).body as CreationFicheApi;
      expect(brouillon).toMatchObject({ statut: 'BROUILLON', commentaires: { total: 0 } });
      await lea.get(`/api/v1/creations/${fiche.id}`).expect(404);
      expect(await indexee(fiche.id)).toBe(false);
      await envoyer(awa, 'delete', `/creations/${fiche.id}/publication`).expect(409);
      // Republiée, elle retrouve ses commentaires ; son type reste verrouillé.
      const republiee = (await publier(awa, fiche.id).expect(200)).body as CreationFicheApi;
      expect(republiee.commentaires.total).toBe(1);
      await enregistrer(awa, fiche.id, { ...unPrompt(), type: 'PROJET' }).expect(400);
    });

    it('supprime : plus personne ne la voit et les points liés sont annulés (RG-19, RG-82)', async () => {
      const awa = await agentConnecte();
      const fiche = await publiee(awa);
      const lea = await agentConnecte('lea@example.com');
      const leaId = ((await lea.get('/api/v1/session').expect(200)).body.membre as { id: number })
        .id;
      await envoyer(lea, 'put', `/contenus/${fiche.id}/votes/UTILE`).expect(200);
      await envoyer(lea, 'post', `/creations/${fiche.id}/reproductions`, {
        outilId,
        resultat: 'SUCCES',
      }).expect(201);
      expect([await sommePoints(awaId), await sommePoints(leaId)]).toEqual([15, 2]);

      await envoyer(awa, 'delete', `/creations/${fiche.id}`).expect(204);
      const [ligne] = await contexte.db
        .select({ statut: contenu.statut })
        .from(contenu)
        .where(eq(contenu.id, fiche.id));
      expect(ligne?.statut).toBe('SUPPRIME');
      await awa.get(`/api/v1/creations/${fiche.id}`).expect(404);
      await lea.get(`/api/v1/creations/${fiche.id}`).expect(404);
      expect([await sommePoints(awaId), await sommePoints(leaId)]).toEqual([0, 0]);
      expect(
        await contexte.db.$count(
          mouvementReputation,
          and(
            eq(mouvementReputation.motif, 'ANNULATION'),
            eq(mouvementReputation.contenuId, fiche.id),
          ),
        ),
      ).toBe(3);
      expect(await indexee(fiche.id)).toBe(false);
      await envoyer(awa, 'delete', `/creations/${fiche.id}`).expect(404);
    });

    it('laisse son seul auteur écrire une création (RG-30)', async () => {
      const awa = await agentConnecte();
      const fiche = await publiee(awa);
      const brouillon = (await creer(awa, unPrompt()).expect(201)).body as CreationFicheApi;
      const lea = await agentConnecte('lea@example.com');
      expect((await enregistrer(lea, fiche.id, unPrompt()).expect(403)).body.detail).toBe(
        'Seul son auteur peut modifier cette création.',
      );
      await envoyer(lea, 'delete', `/creations/${fiche.id}`).expect(403);
      await envoyer(lea, 'delete', `/creations/${fiche.id}/publication`).expect(403);
      await enregistrer(lea, brouillon.id, unPrompt()).expect(404);
      await publier(lea, brouillon.id).expect(404);
    });

    it('garde l’avertissement « instructions pour agent » posé par la modération (RG-23)', async () => {
      const awa = await agentConnecte();
      const { id } = (await creer(awa, unPrompt()).expect(201)).body as CreationFicheApi;
      await contexte.db
        .update(creation)
        .set({ avertissementAgent: 'MODERATION' })
        .where(eq(creation.id, id));
      const relue = (
        await enregistrer(awa, id, { ...unPrompt(), instructionsAgent: false }).expect(200)
      ).body as CreationFicheApi;
      expect(relue.avertissementAgent).toBe('MODERATION');
    });
  });
});
