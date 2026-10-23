import { Inject, Injectable } from '@nestjs/common';
import type { TypeJeton } from '@vysora/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { jetonAleatoire, sha256 } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { jeton } from '../../db/schema/index.js';

export type LigneJeton = typeof jeton.$inferSelect;

/** Lecture d'un lien : valable ; expiré (le compte reste connu, pour renvoyer un lien) ; déjà utilisé ; inconnu. */
export type LectureJeton =
  { etat: 'valable' | 'expire' | 'utilise'; ligne: LigneJeton } | { etat: 'inconnu' };

/* Liens à usage unique envoyés par e-mail (vérification de l'adresse, réinitialisation du mot de passe).
   Le jeton part dans le lien ; la base n'en garde que l'empreinte SHA-256. Un nouveau lien remplace
   les précédents du même type, qui cessent de fonctionner. */
@Injectable()
export class JetonsService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async creer(
    utilisateurId: number,
    type: TypeJeton,
    dureeMs: number,
    db: Executeur = this.db,
  ): Promise<string> {
    const valeur = jetonAleatoire();
    await db
      .delete(jeton)
      .where(
        and(
          eq(jeton.utilisateurId, utilisateurId),
          eq(jeton.type, type),
          isNull(jeton.dateUtilisation),
        ),
      );
    await db.insert(jeton).values({
      utilisateurId,
      type,
      empreinte: sha256(valeur),
      dateExpiration: new Date(Date.now() + dureeMs),
    });
    return valeur;
  }

  /** Un lien ne sert qu'une fois : un lien déjà utilisé n'est plus valable. */
  async lire(valeur: string, type: TypeJeton, maintenant = new Date()): Promise<LectureJeton> {
    const [ligne] = await this.db
      .select()
      .from(jeton)
      .where(and(eq(jeton.empreinte, sha256(valeur)), eq(jeton.type, type)))
      .limit(1);
    if (!ligne) return { etat: 'inconnu' };
    if (ligne.dateUtilisation) return { etat: 'utilise', ligne };
    return ligne.dateExpiration > maintenant
      ? { etat: 'valable', ligne }
      : { etat: 'expire', ligne };
  }

  /** Marque le lien comme utilisé ; faux s'il l'a déjà été entre-temps (deux clics simultanés). */
  async consommer(id: number, db: Executeur = this.db): Promise<boolean> {
    const utilises = await db
      .update(jeton)
      .set({ dateUtilisation: new Date() })
      .where(and(eq(jeton.id, id), isNull(jeton.dateUtilisation)))
      .returning({ id: jeton.id });
    return utilises.length === 1;
  }

  /** Tous les liens encore ouverts d'un type (changement d'adresse, mot de passe modifié). */
  async annuler(utilisateurId: number, type: TypeJeton, db: Executeur = this.db): Promise<void> {
    await db
      .delete(jeton)
      .where(
        and(
          eq(jeton.utilisateurId, utilisateurId),
          eq(jeton.type, type),
          isNull(jeton.dateUtilisation),
        ),
      );
  }
}
