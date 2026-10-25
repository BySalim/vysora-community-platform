import type { TypeCreation, TypeLienExterne } from './enums';
import { LIMITES, LONGUEURS } from './regles';

/* Contrôles de publication d'une création (CREA-05) : RG-10 à RG-16 et la règle du résultat décidée
   le 24 octobre (registre, « Décisions prises »). L'API les applique à ce qui est enregistré ;
   l'éditeur (CREA-02) les applique à sa saisie pour annoncer les mêmes erreurs avant l'envoi.
   Les messages sont ceux de l'éditeur du prototype (nouvelle-creation.js, valider), complétés pour
   les règles qu'il ne contrôlait pas. Les clés suivent le chemin des champs de `schemaContenuCreation`
   (« etapes.0.echanges.1.prompt »), dans l'ordre de la page. Les prompts sont numérotés d'un bout
   à l'autre du parcours, comme dans l'éditeur. */

/** Image telle que la publication la contrôle : décrite ou non (ENF-01). */
export interface ImageAControler {
  texteAlternatif: string | null;
}

export interface CreationAControler {
  type: TypeCreation;
  titre: string | null;
  objectif: string | null;
  categorieId: number | null;
  resultat: { texte: string } | null;
  images: ImageAControler[];
  liens: { type: TypeLienExterne }[];
  etapes: {
    titre: string | null;
    recit: string | null;
    configurations: { outilId: number | null }[];
    echanges: {
      prompt: string | null;
      reponse: string | null;
      /** Rang de la configuration de l'étape utilisée. */
      configuration: number | null;
      images: ImageAControler[];
    }[];
    moments: { explication: string | null; echange: number | null }[];
  }[];
}

export interface ContexteControle {
  /** Liens permis au niveau de l'auteur (liensMaximum : RG-85, RG-16). */
  liensMaximum: number;
}

/** Liens qui donnent à eux seuls le résultat d'une création (RG-13, décision du 24 octobre). */
export const LIENS_RESULTAT: readonly TypeLienExterne[] = ['DEMO', 'DEPOT_CODE', 'VIDEO'];

/** Messages qui ne dépendent pas de la saisie. */
export const MESSAGES_PUBLICATION = {
  resultat: 'Ajoutez le résultat obtenu : un texte, du code, un fichier ou un lien.',
  chemin: 'Ajoutez au moins un prompt, avec l’outil utilisé.',
  categorie: 'Choisissez une catégorie.',
  confirmation: 'Cochez cette case pour publier.',
} as const;

const longueur = (texte: string | null): number => (texte ?? '').trim().length;
const decrite = (image: ImageAControler) => longueur(image.texteAlternatif) > 0;

/** Erreurs qui empêchent la publication, par champ ; un objet vide : la création peut être publiée. */
export function controlerPublication(
  creation: CreationAControler,
  contexte: ContexteControle,
): Record<string, string> {
  const erreurs: Record<string, string> = {};
  const ajouter = (cle: string, message: string) => {
    if (!(cle in erreurs)) erreurs[cle] = message;
  };
  const projet = creation.type === 'PROJET';

  // RG-10 : titre et objectif.
  const lt = longueur(creation.titre);
  if (lt < LONGUEURS.creationTitre.min)
    ajouter(
      'titre',
      lt
        ? `Le titre doit compter au moins ${LONGUEURS.creationTitre.min} caractères (${lt} pour l’instant).`
        : 'Donnez un titre à la création.',
    );
  const lo = longueur(creation.objectif);
  if (lo < LONGUEURS.creationObjectif.min)
    ajouter(
      'objectif',
      lo
        ? `Décrivez l’objectif en ${LONGUEURS.creationObjectif.min} caractères au moins (${lo} pour l’instant).`
        : 'Dites ce que vous vouliez obtenir.',
    );

  // Résultat (décision du 24 octobre) : images, texte ou code, lien de démo, de dépôt ou de vidéo ;
  // pour un « 1 prompt » ou une itération, la réponse ou une image du dernier échange suffit (RG-11, RG-12).
  const dernier = projet ? undefined : creation.etapes[0]?.echanges.at(-1);
  const resultat =
    creation.images.length > 0 ||
    longueur(creation.resultat?.texte ?? null) > 0 ||
    creation.liens.some((lien) => LIENS_RESULTAT.includes(lien.type)) ||
    (dernier !== undefined && (longueur(dernier.reponse) > 0 || dernier.images.length > 0));
  if (!resultat) ajouter('resultat', MESSAGES_PUBLICATION.resultat);
  creation.images.forEach((image, i) => {
    if (!decrite(image))
      ajouter(
        `images.${i}.texteAlternatif`,
        creation.images.length > 1
          ? `Décrivez l’image ${i + 1} du résultat pour les personnes qui ne la voient pas.`
          : 'Décrivez l’image du résultat pour les personnes qui ne la voient pas.',
      );
  });
  if (creation.liens.length > contexte.liensMaximum)
    ajouter('liens', `Gardez ${contexte.liensMaximum} liens au plus à votre niveau.`);
  const images =
    creation.images.length +
    creation.etapes.reduce(
      (total, etape) => total + etape.echanges.reduce((n, echange) => n + echange.images.length, 0),
      0,
    );
  if (images > LIMITES.imagesParCreation)
    ajouter('images', `Gardez ${LIMITES.imagesParCreation} images au plus pour une création.`);

  // Chemin : RG-10 (au moins une configuration), RG-11 à RG-14.
  const outilQuelquePart = creation.etapes.some((etape) =>
    etape.configurations.some((configuration) => configuration.outilId !== null),
  );
  const prompts = creation.etapes.reduce((total, etape) => total + etape.echanges.length, 0);
  if (!outilQuelquePart || (!projet && prompts === 0))
    ajouter('etapes', MESSAGES_PUBLICATION.chemin);
  if (creation.type === 'UN_PROMPT' && (creation.etapes.length > 1 || prompts > 1))
    ajouter('etapes', 'Une création « 1 prompt » compte un seul prompt.');
  if (creation.type === 'ITERATION') {
    if (creation.etapes.length > 1)
      ajouter('etapes', 'Une itération se déroule en une seule étape.');
    else if (prompts === 1)
      ajouter('etapes.0.echanges', 'Une itération compte au moins deux prompts.');
  }
  if (projet && creation.etapes.length < 2)
    ajouter('etapes', 'Un projet compte au moins deux étapes.');

  let n = 0;
  creation.etapes.forEach((etape, e) => {
    const chemin = `etapes.${e}`;
    const numero = e + 1;
    if (projet) {
      // RG-13 : titre et récit de chaque étape.
      const ltitre = longueur(etape.titre);
      if (ltitre < LONGUEURS.etapeTitre.min)
        ajouter(
          `${chemin}.titre`,
          ltitre
            ? `Le titre de l’étape ${numero} doit compter au moins ${LONGUEURS.etapeTitre.min} caractères.`
            : `Donnez un titre à l’étape ${numero}.`,
        );
      const lrecit = longueur(etape.recit);
      if (lrecit < LONGUEURS.etapeRecit.min)
        ajouter(
          `${chemin}.recit`,
          lrecit
            ? `Racontez l’étape ${numero} en ${LONGUEURS.etapeRecit.min} caractères au moins (${lrecit} pour l’instant).`
            : `Racontez ce que vous avez fait à l’étape ${numero}.`,
        );
    }

    // RG-14 : une configuration pour un « 1 prompt » ou une itération ; pour un projet, au moins une
    // si l'étape a des échanges, et chaque échange désigne la sienne s'il y en a plusieurs.
    const premier = n + 1;
    if (!projet) {
      if (etape.echanges.length && !etape.configurations.length)
        ajouter(`${chemin}.configurations`, `Choisissez l’outil du prompt ${premier}.`);
      if (etape.configurations.length > 1)
        ajouter(
          `${chemin}.configurations`,
          'Gardez un seul outil : avec plusieurs outils, la création devient un projet.',
        );
    } else if (etape.echanges.length && !etape.configurations.length)
      ajouter(`${chemin}.configurations`, `Étape ${numero} : indiquez l’outil utilisé.`);
    etape.configurations.forEach((configuration, c) => {
      if (configuration.outilId === null)
        ajouter(
          `${chemin}.configurations.${c}.outilId`,
          projet
            ? `Étape ${numero} : choisissez l’outil.`
            : `Choisissez l’outil du prompt ${premier}.`,
        );
    });

    etape.echanges.forEach((echange, x) => {
      n += 1;
      const cle = `${chemin}.echanges.${x}`;
      if (!longueur(echange.prompt))
        ajouter(`${cle}.prompt`, `Collez le texte du prompt ${n}, ou retirez-le.`);
      if (etape.configurations.length > 1 && echange.configuration === null)
        ajouter(`${cle}.configuration`, `Choisissez l’outil du prompt ${n}.`);
      echange.images.forEach((image, i) => {
        if (!decrite(image))
          ajouter(`${cle}.images.${i}.texteAlternatif`, `Décrivez l’image jointe au prompt ${n}.`);
      });
    });

    // RG-15 : explication de 20 caractères au moins.
    etape.moments.forEach((moment, m) => {
      const lm = longueur(moment.explication);
      if (lm >= LONGUEURS.momentCleExplication.min) return;
      const min = LONGUEURS.momentCleExplication.min;
      const prefixe =
        moment.echange !== null
          ? `Prompt ${premier + moment.echange} : `
          : projet
            ? `Étape ${numero} : `
            : '';
      const message = lm
        ? `${prefixe}expliquez le moment clé en ${min} caractères au moins.`
        : `${prefixe}expliquez le moment clé.`;
      ajouter(
        `${chemin}.moments.${m}.explication`,
        prefixe ? message : message.charAt(0).toUpperCase() + message.slice(1),
      );
    });
  });

  // RG-10 : catégorie.
  if (creation.categorieId === null) ajouter('categorieId', MESSAGES_PUBLICATION.categorie);
  return erreurs;
}

/** Condition de publication telle que « Mes contenus » la présente (barre d'avancement, liste à compléter). */
export interface ConditionPublication {
  libelle: string;
  remplie: boolean;
}

/** Conditions de publication d'un brouillon, dans l'ordre de l'éditeur (prototype : mes-contenus.js,
    verifier), tirées de controlerPublication : toutes remplies si et seulement si la création peut être
    publiée (la case de confirmation mise à part). Les libellés sont ceux du prototype ; les images à
    décrire, les moments clés à expliquer et les liens en trop ajoutent la leur quand ils existent. */
export function conditionsPublication(
  creation: CreationAControler,
  contexte: ContexteControle,
): ConditionPublication[] {
  const erreurs = controlerPublication(creation, contexte);
  const cles = Object.keys(erreurs);
  const restantes = new Set(cles);
  const projet = creation.type === 'PROJET';
  const prompts = creation.etapes.reduce((total, etape) => total + etape.echanges.length, 0);
  const outil = creation.etapes.some((etape) =>
    etape.configurations.some((configuration) => configuration.outilId !== null),
  );
  // « Ajoutez au moins un prompt, avec l’outil utilisé » : il manque l'outil, le prompt ou les deux.
  const messageChemin = erreurs.etapes === MESSAGES_PUBLICATION.chemin;

  const condition = (
    libelle: string,
    concerne: (cle: string) => boolean,
    aussi = true,
  ): ConditionPublication => {
    let remplie = aussi;
    for (const cle of cles)
      if (concerne(cle)) {
        remplie = false;
        restantes.delete(cle);
      }
    return { libelle, remplie };
  };
  const cheminDuType = (cle: string) =>
    (cle === 'etapes' && (!messageChemin || (!projet && prompts === 0))) ||
    cle === 'etapes.0.echanges' ||
    /^etapes\.\d+\.echanges\.\d+\.prompt$/.test(cle) ||
    /^etapes\.\d+\.(titre|recit)$/.test(cle);
  const resultat = (cle: string) => cle === 'resultat';

  const conditions = [
    condition(
      `Un titre de ${LONGUEURS.creationTitre.min} caractères au moins`,
      (cle) => cle === 'titre',
    ),
    condition('L’objectif de la création', (cle) => cle === 'objectif'),
    condition('Une catégorie', (cle) => cle === 'categorieId'),
    condition(
      'L’outil d’IA utilisé',
      (cle) =>
        (cle === 'etapes' && messageChemin && !outil) ||
        /^etapes\.\d+\.configurations(\.|$)/.test(cle) ||
        /^etapes\.\d+\.echanges\.\d+\.configuration$/.test(cle),
      outil,
    ),
  ];
  // Le nombre d'étapes et de prompts se vérifie aussi directement : sous le message du chemin, celui
  // qui le précise (« une seule étape », « au moins deux étapes ») n'est pas renvoyé.
  const etapes = creation.etapes.length;
  if (creation.type === 'ITERATION')
    conditions.push(
      condition('Au moins deux échanges', cheminDuType, etapes <= 1 && prompts >= 2),
      condition('La réponse ou l’image du dernier échange', resultat),
    );
  else if (projet)
    conditions.push(
      condition('Deux étapes avec un titre et un récit', cheminDuType, etapes >= 2),
      condition('Un résultat final : un lien ou une image', resultat),
    );
  else
    conditions.push(
      condition(
        'Le prompt et la réponse ou l’image obtenue',
        (cle) => cheminDuType(cle) || resultat(cle),
        etapes <= 1 && prompts === 1,
      ),
    );

  const images =
    creation.images.length +
    creation.etapes.reduce(
      (total, etape) => total + etape.echanges.reduce((n, x) => n + x.images.length, 0),
      0,
    );
  if (images)
    conditions.push(
      condition(
        'Une description pour chaque image',
        (cle) => cle === 'images' || cle.endsWith('.texteAlternatif'),
      ),
    );
  if (creation.etapes.some((etape) => etape.moments.length))
    conditions.push(
      condition('Une explication pour chaque moment clé', (cle) =>
        /^etapes\.\d+\.moments\.\d+\.explication$/.test(cle),
      ),
    );
  if ('liens' in erreurs)
    conditions.push(
      condition(`${contexte.liensMaximum} liens au plus à votre niveau`, (cle) => cle === 'liens'),
    );
  // Filet de sécurité : un contrôle qu'aucune condition ne présente empêche quand même de publier.
  for (const cle of restantes) conditions.push({ libelle: erreurs[cle] ?? cle, remplie: false });
  return conditions;
}
