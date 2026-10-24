/* Contrats des images (MEDIA-01) : POST, PATCH /api/v1/medias, PUT /api/v1/moi/avatar.
   Les fichiers sont servis en WebP à l'adresse indiquée ; elle ne change jamais pour un même fichier. */

/** Déclinaison d'une image à une largeur donnée (attribut srcset). */
export interface DeclinaisonImage {
  /** Largeur réelle du fichier, en pixels. */
  largeur: number;
  url: string;
}

/** Image téléversée par un membre, rattachée ensuite à un contenu ou à un échange (RG-16). */
export interface MediaApi {
  id: number;
  /** Plus grande déclinaison : attribut src. */
  url: string;
  /** De la plus étroite à la plus large. */
  declinaisons: DeclinaisonImage[];
  /** Dimensions de la plus grande déclinaison (place réservée à l'affichage). */
  largeur: number;
  hauteur: number;
  /** Vide tant que le membre ne l'a pas décrite (obligatoire à la publication). */
  texteAlternatif: string;
  legende: string | null;
}

/** Photo de profil du membre connecté : adresse de l'image carrée, ou null. */
export interface AvatarApi {
  avatar: string | null;
}

/** Attribut srcset d'une image : « adresse largeurw » de chaque déclinaison. */
export const srcsetImage = (media: Pick<MediaApi, 'declinaisons'>): string =>
  media.declinaisons.map((d) => `${d.url} ${d.largeur}w`).join(', ');
