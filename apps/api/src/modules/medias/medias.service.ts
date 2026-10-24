import { Inject, Injectable } from '@nestjs/common';
import type { AvatarApi, DescriptionImage, MediaApi } from '@vysora/shared';
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { ErreurApplication, conflit, erreurValidation, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { media, utilisateur } from '../../db/schema/index.js';
import { Stockage, ecrireDeclinaisons } from './stockage.js';
import {
  ImageRefusee,
  preparerAvatar,
  preparerImage,
  type ImagePreparee,
} from './traitement-images.js';

/** Images déposées et pas encore enregistrées dans un contenu, par membre (protège le disque). */
export const IMAGES_EN_ATTENTE_PAR_MEMBRE = 40;
/** Une image jamais rattachée à un contenu est supprimée après ce délai. */
export const DELAI_ORPHELINE_HEURES = 24;

type LigneMedia = typeof media.$inferSelect;

/** Image telle que l'API la présente : adresses publiques, déclinaisons de la plus étroite à la plus large. */
export function presenterMedia(stockage: Stockage, ligne: LigneMedia): MediaApi {
  return {
    id: ligne.id,
    url: stockage.adresse(ligne.fichier),
    declinaisons: Object.entries(ligne.variantes)
      .map(([largeur, cle]) => ({ largeur: Number(largeur), url: stockage.adresse(cle) }))
      .toSorted((a, b) => a.largeur - b.largeur),
    largeur: ligne.largeur ?? 0,
    hauteur: ligne.hauteur ?? 0,
    texteAlternatif: ligne.texteAlternatif,
    legende: ligne.legende,
  };
}

/** Écrit les déclinaisons d'une image préparée, puis sa ligne ; aucun fichier ne reste si l'écriture en base échoue. */
export async function enregistrerImage(
  db: BaseDeDonnees | Transaction,
  stockage: Stockage,
  image: ImagePreparee,
  valeurs: Pick<
    typeof media.$inferInsert,
    'televerseurId' | 'contenuId' | 'echangeId' | 'texteAlternatif' | 'legende' | 'ordre'
  >,
): Promise<LigneMedia> {
  const plusGrande = image.declinaisons.at(-1);
  if (!plusGrande) throw new Error('Aucune déclinaison produite');
  const cles = await ecrireDeclinaisons(stockage, image.declinaisons);
  try {
    const [ligne] = await db
      .insert(media)
      .values({
        ...valeurs,
        fichier: cles[plusGrande.largeur] as string,
        typeMime: image.typeMime,
        tailleOctets: image.tailleOctets,
        largeur: plusGrande.largeur,
        hauteur: plusGrande.hauteur,
        variantes: cles,
      })
      .returning();
    if (!ligne) throw new Error('Image non enregistrée');
    return ligne;
  } catch (erreur) {
    await stockage.supprimer(Object.values(cles));
    throw erreur;
  }
}

/** Bilan d'un nettoyage. */
export interface BilanNettoyage {
  /** Images téléversées puis jamais rattachées à un contenu. */
  images: number;
  /** Fichiers qu'aucune ligne ne désigne plus (contenu supprimé, photo remplacée, envoi interrompu). */
  fichiers: number;
}

/* MEDIA-01 : images des contenus et photos de profil (F-05, F-15, RG-16).
   Une image est téléversée dès que le membre la dépose dans un éditeur, sans rattachement ;
   l'enregistrement du contenu la rattache (CREA-01 et suivants). Le nettoyage supprime celles
   qui ne l'ont jamais été, et tout fichier qu'aucune ligne ne désigne plus. */
@Injectable()
export class MediasService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async televerser(
    membreId: number,
    fichier: Buffer | undefined,
    description: DescriptionImage,
  ): Promise<MediaApi> {
    const enAttente = await this.db.$count(
      media,
      and(eq(media.televerseurId, membreId), isNull(media.contenuId), isNull(media.echangeId)),
    );
    if (enAttente >= IMAGES_EN_ATTENTE_PAR_MEMBRE)
      throw new ErreurApplication(
        'LIMITE_ATTEINTE',
        `Vous avez ajouté ${IMAGES_EN_ATTENTE_PAR_MEMBRE} images qui ne sont pas encore enregistrées. Enregistrez votre brouillon ou retirez des images avant d’en ajouter d’autres.`,
      );

    const image = await controler(fichier, preparerImage);
    const ligne = await enregistrerImage(this.db, this.stockage, image, {
      televerseurId: membreId,
      texteAlternatif: description.texteAlternatif ?? '',
      legende: description.legende ?? null,
    });
    return presenterMedia(this.stockage, ligne);
  }

  /** Texte alternatif et légende : seul le membre qui a téléversé l'image les modifie. */
  async decrire(membreId: number, id: number, description: DescriptionImage): Promise<MediaApi> {
    const ligne = await this.sienne(membreId, id);
    if (description.texteAlternatif === undefined && description.legende === undefined)
      return presenterMedia(this.stockage, ligne);
    const [modifiee] = await this.db
      .update(media)
      .set({
        ...(description.texteAlternatif !== undefined
          ? { texteAlternatif: description.texteAlternatif }
          : {}),
        ...(description.legende !== undefined ? { legende: description.legende } : {}),
      })
      .where(eq(media.id, id))
      .returning();
    if (!modifiee) throw introuvable();
    return presenterMedia(this.stockage, modifiee);
  }

  /** Retire une image déposée et pas encore enregistrée ; une image rattachée se retire depuis son contenu. */
  async retirer(membreId: number, id: number): Promise<void> {
    const ligne = await this.sienne(membreId, id);
    if (ligne.contenuId !== null || ligne.echangeId !== null)
      throw conflit(
        'Cette image fait partie d’un contenu enregistré : retirez-la depuis ce contenu.',
      );
    await this.db.delete(media).where(eq(media.id, id));
    await this.stockage.supprimer(Object.values(ligne.variantes));
  }

  /** F-05 : photo de profil, remplacée en une fois ; l'ancienne est supprimée. */
  async definirAvatar(membreId: number, fichier: Buffer | undefined): Promise<AvatarApi> {
    const avatar = await controler(fichier, preparerAvatar);
    const cles = await ecrireDeclinaisons(this.stockage, [avatar]);
    const cle = cles[avatar.largeur] as string;
    const precedente = await this.remplacerAvatar(membreId, cle).catch(async (erreur: unknown) => {
      await this.stockage.supprimer([cle]);
      throw erreur;
    });
    if (precedente) await this.stockage.supprimer([precedente]);
    return { avatar: this.stockage.adresse(cle) };
  }

  async retirerAvatar(membreId: number): Promise<AvatarApi> {
    const precedente = await this.remplacerAvatar(membreId, null);
    if (precedente) await this.stockage.supprimer([precedente]);
    return { avatar: null };
  }

  /** Images jamais rattachées depuis 24 heures, puis fichiers qu'aucune ligne ne désigne plus. */
  async nettoyer(maintenant = new Date()): Promise<BilanNettoyage> {
    const limite = new Date(maintenant.getTime() - DELAI_ORPHELINE_HEURES * 3_600_000);
    const orphelines = await this.db
      .delete(media)
      .where(
        and(isNull(media.contenuId), isNull(media.echangeId), lt(media.dateTeleversement, limite)),
      )
      .returning({ variantes: media.variantes });
    await this.stockage.supprimer(orphelines.flatMap((ligne) => Object.values(ligne.variantes)));

    const designes = new Set<string>();
    for (const ligne of await this.db.select({ variantes: media.variantes }).from(media))
      for (const cle of Object.values(ligne.variantes)) designes.add(cle);
    for (const ligne of await this.db
      .select({ avatar: utilisateur.avatar })
      .from(utilisateur)
      .where(isNotNull(utilisateur.avatar)))
      if (ligne.avatar) designes.add(ligne.avatar);

    const sansLigne: string[] = [];
    // Un fichier récent peut appartenir à un envoi en cours, pas encore enregistré en base.
    for await (const fichier of this.stockage.lister())
      if (fichier.date < limite && !designes.has(fichier.cle)) sansLigne.push(fichier.cle);
    await this.stockage.supprimer(sansLigne);

    return { images: orphelines.length, fichiers: sansLigne.length };
  }

  private async sienne(membreId: number, id: number): Promise<LigneMedia> {
    const [ligne] = await this.db
      .select()
      .from(media)
      .where(and(eq(media.id, id), eq(media.televerseurId, membreId)));
    // L'image d'un autre membre est présentée comme introuvable : son existence n'est pas révélée.
    if (!ligne) throw introuvable('Cette image est introuvable.');
    return ligne;
  }

  /** Nouvelle clé de la photo de profil ; renvoie la précédente. */
  private async remplacerAvatar(membreId: number, cle: string | null): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      const [membre] = await tx
        .select({ avatar: utilisateur.avatar })
        .from(utilisateur)
        .where(eq(utilisateur.id, membreId))
        .for('update');
      if (!membre) throw introuvable();
      await tx.update(utilisateur).set({ avatar: cle }).where(eq(utilisateur.id, membreId));
      return membre.avatar;
    });
  }
}

/** Contrôle du fichier reçu ; un refus devient une erreur de saisie sur le champ « fichier ». */
async function controler<T>(
  fichier: Buffer | undefined,
  preparer: (octets: Buffer) => Promise<T>,
): Promise<T> {
  try {
    if (!fichier) throw new ImageRefusee('absente');
    return await preparer(fichier);
  } catch (erreur) {
    if (erreur instanceof ImageRefusee) throw erreurValidation({ fichier: erreur.message });
    throw erreur;
  }
}
