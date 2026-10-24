import { LIMITES, type TypeMimeImage } from '@vysora/shared';
import sharp, { type Metadata, type Sharp, type SharpOptions } from 'sharp';

/* RG-16 : seules les images PNG, JPEG, WebP et GIF sont acceptées, 5 Mo au plus, reconnues par leur
   signature (jamais par l'extension ni par le type annoncé). Chaque image est décodée puis ré-encodée
   en WebP : un fichier piégé ne survit pas au ré-encodage, et les métadonnées (EXIF : lieu de prise de
   vue, appareil, auteur) ne sont pas recopiées. L'orientation de l'appareil photo est appliquée avant.
   Les GIF et WebP animés restent animés. */

/** Largeurs des déclinaisons (celles du prototype) ; une image plus étroite garde sa largeur. */
export const LARGEURS_IMAGE = [720, 1280] as const;
/** Côté de la photo de profil, carrée (affichée de 20 à 148 pixels). */
export const COTE_AVATAR = 256;
/** Au-delà, un fichier de 5 Mo peut se décompresser en gigaoctets (bombe de décompression). */
export const PIXELS_MAX = 50_000_000;
/** Plus grand côté permis par le format WebP. */
const COTE_MAX_WEBP = 16_383;
const QUALITE_WEBP = 82;

export type MotifRefusImage = 'absente' | 'format' | 'taille' | 'dimensions' | 'illisible';

export const MESSAGES_REFUS_IMAGE: Record<MotifRefusImage, string> = {
  absente: 'Choisissez une image.',
  format: 'Ce fichier n’est pas une image PNG, JPEG, WebP ou GIF.',
  taille: 'Cette image dépasse 5 Mo. Réduisez-la avant de l’ajouter.',
  dimensions: 'Cette image est trop grande : 50 millions de pixels au plus.',
  illisible: 'Cette image ne peut pas être lue. Choisissez un autre fichier.',
};

export class ImageRefusee extends Error {
  constructor(readonly motif: MotifRefusImage) {
    super(MESSAGES_REFUS_IMAGE[motif]);
    this.name = 'ImageRefusee';
  }
}

const FORMAT_DECODE: Record<TypeMimeImage, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Type d'image d'après les premiers octets du fichier, ou null si ce n'en est pas une des quatre permises. */
export function reconnaitreFormat(octets: Uint8Array): TypeMimeImage | null {
  const commencePar = (signature: readonly number[], decalage = 0) =>
    signature.every((octet, i) => octets[decalage + i] === octet);
  if (commencePar([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (commencePar([0xff, 0xd8, 0xff])) return 'image/jpeg';
  // GIF87a, GIF89a
  if (commencePar([0x47, 0x49, 0x46, 0x38]) && (octets[4] === 0x37 || octets[4] === 0x39))
    return octets[5] === 0x61 ? 'image/gif' : null;
  // RIFF....WEBP
  if (commencePar([0x52, 0x49, 0x46, 0x46]) && commencePar([0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';
  return null;
}

export interface Declinaison {
  largeur: number;
  /** Hauteur d'une image (d'une seule vue pour une animation). */
  hauteur: number;
  contenu: Buffer;
}

export interface ImagePreparee {
  /** Format du fichier reçu ; les déclinaisons sont en WebP. */
  typeMime: TypeMimeImage;
  tailleOctets: number;
  /** De la plus étroite à la plus large. */
  declinaisons: Declinaison[];
}

/** Image d'un contenu : contrôlée, puis déclinée en WebP aux largeurs du site (RG-16). */
export async function preparerImage(octets: Buffer): Promise<ImagePreparee> {
  const { typeMime, largeur } = await examiner(octets, true);
  const plusLarge = LARGEURS_IMAGE[LARGEURS_IMAGE.length - 1];
  const cibles = new Set([
    ...LARGEURS_IMAGE.filter((cible) => cible < largeur),
    Math.min(largeur, plusLarge),
  ]);
  const declinaisons: Declinaison[] = [];
  for (const cible of cibles) {
    const declinaison = await encoder(octets, true, (image) =>
      image.resize({
        width: cible,
        height: COTE_MAX_WEBP,
        fit: 'inside',
        withoutEnlargement: true,
      }),
    );
    // Une image très haute peut donner deux fois la même largeur : une seule déclinaison suffit.
    if (!declinaisons.some((d) => d.largeur === declinaison.largeur))
      declinaisons.push(declinaison);
  }
  return {
    typeMime,
    tailleOctets: octets.length,
    declinaisons: declinaisons.toSorted((a, b) => a.largeur - b.largeur),
  };
}

/** Photo de profil : carrée, cadrée sur la zone la plus marquante, sans animation ni agrandissement. */
export async function preparerAvatar(octets: Buffer): Promise<Declinaison> {
  const { largeur, hauteur } = await examiner(octets, false);
  const cote = Math.min(COTE_AVATAR, largeur, hauteur);
  return encoder(octets, false, (image) =>
    image.resize(cote, cote, { fit: 'cover', position: 'attention' }),
  );
}

const optionsDecodage = (anime: boolean): SharpOptions => ({
  animated: anime,
  limitInputPixels: PIXELS_MAX,
});

/** Signature, format réellement décodé, dimensions : tout est vérifié avant de décoder l'image entière. */
async function examiner(
  octets: Buffer,
  anime: boolean,
): Promise<{ typeMime: TypeMimeImage; largeur: number; hauteur: number }> {
  if (!octets.length) throw new ImageRefusee('absente');
  if (octets.length > LIMITES.tailleImageOctets) throw new ImageRefusee('taille');
  const typeMime = reconnaitreFormat(octets);
  if (!typeMime) throw new ImageRefusee('format');

  let infos: Metadata;
  try {
    // Seul l'en-tête est lu ici : la limite de pixels est appliquée juste après, avec son propre motif.
    infos = await sharp(octets, { ...optionsDecodage(anime), limitInputPixels: false }).metadata();
  } catch {
    throw new ImageRefusee('illisible');
  }
  if (infos.format !== FORMAT_DECODE[typeMime] || !infos.width || !infos.height)
    throw new ImageRefusee('illisible');
  // Pour une animation, la hauteur lue est celle de toutes les vues empilées : la limite les compte toutes.
  if (infos.width * infos.height > PIXELS_MAX) throw new ImageRefusee('dimensions');
  return {
    typeMime,
    // Dimensions une fois l'orientation de l'appareil appliquée (photo prise en portrait).
    largeur: infos.autoOrient.width,
    hauteur: infos.pageHeight ?? infos.autoOrient.height,
  };
}

async function encoder(
  octets: Buffer,
  anime: boolean,
  transformer: (image: Sharp) => Sharp,
): Promise<Declinaison> {
  try {
    const { data, info } = await transformer(sharp(octets, optionsDecodage(anime)).autoOrient())
      .webp({ quality: QUALITE_WEBP })
      .toBuffer({ resolveWithObject: true });
    return { largeur: info.width, hauteur: info.pageHeight ?? info.height, contenu: data };
  } catch {
    // En-tête correct mais données corrompues ou tronquées.
    throw new ImageRefusee('illisible');
  }
}
