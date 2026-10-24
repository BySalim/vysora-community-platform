import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import {
  COTE_AVATAR,
  ImageRefusee,
  preparerAvatar,
  preparerImage,
  reconnaitreFormat,
  type MotifRefusImage,
} from './traitement-images.js';

const image = (largeur: number, hauteur: number) =>
  sharp({ create: { width: largeur, height: hauteur, channels: 3, background: '#2f6b5e' } });

const refus = async (promesse: Promise<unknown>): Promise<MotifRefusImage | undefined> => {
  try {
    await promesse;
    return undefined;
  } catch (erreur) {
    if (erreur instanceof ImageRefusee) return erreur.motif;
    throw erreur;
  }
};

/** PNG dont l'en-tête annonce d'autres dimensions (somme de contrôle recalculée) : rien n'est décodé. */
function pngAnnoncant(png: Buffer, largeur: number, hauteur: number): Buffer {
  const copie = Buffer.from(png);
  // Signature (8 octets), longueur (4), « IHDR » (4), puis largeur et hauteur.
  copie.writeUInt32BE(largeur, 16);
  copie.writeUInt32BE(hauteur, 20);
  copie.writeUInt32BE(crc32(copie.subarray(12, 29)), 29);
  return copie;
}

describe('reconnaitreFormat (RG-16 : signature, jamais l’extension)', () => {
  it('reconnaît PNG, JPEG, WebP et GIF', async () => {
    expect(reconnaitreFormat(await image(4, 4).png().toBuffer())).toBe('image/png');
    expect(reconnaitreFormat(await image(4, 4).jpeg().toBuffer())).toBe('image/jpeg');
    expect(reconnaitreFormat(await image(4, 4).webp().toBuffer())).toBe('image/webp');
    expect(reconnaitreFormat(await image(4, 4).gif().toBuffer())).toBe('image/gif');
  });

  it('refuse tout le reste, y compris SVG, HTML et les formats d’image non hébergés', async () => {
    expect(reconnaitreFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(reconnaitreFormat(Buffer.from('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(reconnaitreFormat(await image(4, 4).tiff().toBuffer())).toBeNull();
    expect(reconnaitreFormat(await image(4, 4).avif().toBuffer())).toBeNull();
    expect(reconnaitreFormat(Buffer.from('GIF8xa'))).toBeNull();
    expect(reconnaitreFormat(Buffer.alloc(0))).toBeNull();
  });
});

describe('preparerImage', () => {
  it('décline une grande image en WebP de 720 et 1280 pixels de large, proportions gardées', async () => {
    const preparee = await preparerImage(await image(2000, 1500).png().toBuffer());
    expect(preparee.typeMime).toBe('image/png');
    expect(preparee.declinaisons.map(({ largeur, hauteur }) => [largeur, hauteur])).toEqual([
      [720, 540],
      [1280, 960],
    ]);
    for (const declinaison of preparee.declinaisons)
      expect(reconnaitreFormat(declinaison.contenu)).toBe('image/webp');
  });

  it('n’agrandit jamais : une image étroite garde sa largeur', async () => {
    const etroite = await preparerImage(await image(600, 400).jpeg().toBuffer());
    expect(etroite.declinaisons.map((d) => d.largeur)).toEqual([600]);
    const moyenne = await preparerImage(await image(1000, 800).webp().toBuffer());
    expect(moyenne.declinaisons.map((d) => d.largeur)).toEqual([720, 1000]);
  });

  it('retire les métadonnées EXIF (lieu, appareil) et applique l’orientation de l’appareil', async () => {
    const photo = await image(300, 200)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExif({ IFD0: { Make: 'Téléphone', Copyright: 'Awa Sarr' } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const [declinaison] = (await preparerImage(photo)).declinaisons;
    if (!declinaison) throw new Error('Aucune déclinaison');
    const sortie = await sharp(declinaison.contenu).metadata();
    expect(sortie.exif).toBeUndefined();
    expect(sortie.orientation).toBeUndefined();
    // Prise en portrait : la largeur affichée est la hauteur enregistrée.
    expect([declinaison.largeur, declinaison.hauteur]).toEqual([200, 300]);
  });

  it('garde l’animation d’un GIF', async () => {
    const vues = await Promise.all(
      ['#c0392b', '#27ae60', '#2980b9'].map((couleur) =>
        sharp({ create: { width: 900, height: 600, channels: 3, background: couleur } })
          .png()
          .toBuffer(),
      ),
    );
    const gif = await sharp(vues, { join: { animated: true } })
      .gif()
      .toBuffer();
    const [, grande] = (await preparerImage(gif)).declinaisons;
    if (!grande) throw new Error('Deux déclinaisons attendues');
    expect([grande.largeur, grande.hauteur]).toEqual([900, 600]);
    expect((await sharp(grande.contenu, { animated: true }).metadata()).pages).toBe(3);
  });

  it('refuse un fichier déguisé, vide, tronqué ou trop lourd', async () => {
    expect(await refus(preparerImage(Buffer.from('<svg onload="alert(1)"/>')))).toBe('format');
    expect(await refus(preparerImage(Buffer.alloc(0)))).toBe('absente');
    const jpeg = await image(400, 300).jpeg().toBuffer();
    expect(await refus(preparerImage(jpeg.subarray(0, 120)))).toBe('illisible');
    // Signature PNG suivie d'autre chose.
    const faux = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      jpeg,
    ]);
    expect(await refus(preparerImage(faux))).toBe('illisible');
    const lourd = Buffer.concat([jpeg, Buffer.alloc(5 * 1024 * 1024)]);
    expect(await refus(preparerImage(lourd))).toBe('taille');
  });

  it('refuse une image qui se décompresserait en plus de 50 millions de pixels', async () => {
    const piege = pngAnnoncant(await image(8, 8).png().toBuffer(), 10_000, 10_000);
    expect(await refus(preparerImage(piege))).toBe('dimensions');
  });
});

describe('preparerAvatar', () => {
  it('produit une image carrée de 256 pixels au plus, sans agrandir', async () => {
    const grande = await preparerAvatar(await image(1200, 800).png().toBuffer());
    expect([grande.largeur, grande.hauteur]).toEqual([COTE_AVATAR, COTE_AVATAR]);
    const petite = await preparerAvatar(await image(300, 128).png().toBuffer());
    expect([petite.largeur, petite.hauteur]).toEqual([128, 128]);
  });
});
