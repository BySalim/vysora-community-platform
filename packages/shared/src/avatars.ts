/* Avatars proposés (F-05, RG-07) : têtes d'animaux géométriques, une couleur de fond chacune
   (prototype : assets/avatars/choix, provenance dans generation.json). Un avatar est tiré au hasard
   à la création du compte ; le membre le change à l'inscription ou depuis son profil. Une photo
   importée passe devant ; la retirer fait revenir l'avatar. */

export const AVATARS = [
  { id: 'renard', nom: 'Renard' },
  { id: 'hibou', nom: 'Hibou' },
  { id: 'chat', nom: 'Chat' },
  { id: 'ours', nom: 'Ours' },
  { id: 'panda', nom: 'Panda' },
  { id: 'lapin', nom: 'Lapin' },
  { id: 'tigre', nom: 'Tigre' },
  { id: 'pingouin', nom: 'Pingouin' },
  { id: 'koala', nom: 'Koala' },
  { id: 'raton-laveur', nom: 'Raton laveur' },
  { id: 'loup', nom: 'Loup' },
  { id: 'elephant', nom: 'Éléphant' },
  { id: 'grenouille', nom: 'Grenouille' },
  { id: 'cerf', nom: 'Cerf' },
  { id: 'lion', nom: 'Lion' },
] as const;

export type AvatarChoisi = (typeof AVATARS)[number]['id'];

export const IDS_AVATARS = AVATARS.map((avatar) => avatar.id) as [AvatarChoisi, ...AvatarChoisi[]];

/** Dossier public du site où sont servies les images des avatars. */
const DOSSIER_AVATARS = '/assets/avatars/choix/';

export const estAvatarChoisi = (valeur: unknown): valeur is AvatarChoisi =>
  typeof valeur === 'string' && (IDS_AVATARS as readonly string[]).includes(valeur);

export const nomAvatar = (id: AvatarChoisi): string =>
  AVATARS.find((avatar) => avatar.id === id)?.nom ?? '';

/** Adresse de l'image d'un avatar (WebP carré, 320 px). */
export const adresseAvatar = (id: AvatarChoisi): string => `${DOSSIER_AVATARS}${id}.webp`;

/** L'adresse d'une image de profil désigne-t-elle un avatar proposé (et non une photo) ? */
export const estAdresseAvatar = (adresse: string | null | undefined): boolean =>
  Boolean(adresse?.startsWith(DOSSIER_AVATARS));

/** Avatar tiré au hasard, différent de `sauf` s'il est donné. */
export function tirerAvatar(
  sauf: string | null = null,
  aleatoire: () => number = Math.random,
): AvatarChoisi {
  const liste = IDS_AVATARS.filter((id) => id !== sauf);
  return liste[Math.floor(aleatoire() * liste.length)] ?? IDS_AVATARS[0];
}

/** RG-07 : image de profil affichée, la photo importée d'abord, à défaut l'avatar choisi. Une
    valeur enregistrée qui ne figure plus dans la liste ne donne aucune image. */
export const imageDeProfil = (
  adressePhoto: string | null,
  avatarChoisi: string | null,
): string | null =>
  adressePhoto ?? (estAvatarChoisi(avatarChoisi) ? adresseAvatar(avatarChoisi) : null);
