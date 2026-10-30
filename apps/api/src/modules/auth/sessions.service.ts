import { Inject, Injectable } from '@nestjs/common';
import { DELAIS } from '@vysora/shared';
import { and, eq, gt, inArray, ne } from 'drizzle-orm';
import type { CookieOptions, Request, Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { nomCookieSession } from '../../commun/securite/cookies.js';
import { empreinteSalee, jetonAleatoire, sha256 } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { session, utilisateur } from '../../db/schema/index.js';
import { resumerAppareil } from './appareil.js';

const JOUR_MS = 86_400_000;
/** L'expiration glisse au plus une fois par heure : pas d'écriture en base à chaque requête. */
const PROLONGATION_MS = 3_600_000;
/** Un compte banni ou supprimé n'a plus de session valable, même si elle n'a pas encore été fermée. */
const STATUTS_CONNECTABLES = ['ACTIF', 'EN_SUPPRESSION'] as const;

export interface SessionOuverte {
  id: string;
  utilisateurId: number;
}

/* Sessions en base et cookie HttpOnly (ADR-0005). Le jeton n'existe qu'en clair dans le cookie ;
   la base n'en garde que l'empreinte SHA-256, qui sert d'identifiant à la session. */
@Injectable()
export class SessionsService {
  private readonly nomCookie: string;

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {
    this.nomCookie = nomCookieSession(config);
  }

  /** Ouvre une session et pose le cookie. Une session déjà présente sur l'appareil est fermée :
      le jeton change à chaque connexion (fixation de session). */
  async ouvrir(
    utilisateurId: number,
    requete: Request,
    reponse: Response,
  ): Promise<SessionOuverte> {
    await this.fermerSiPresente(requete);
    const jeton = jetonAleatoire();
    const id = sha256(jeton);
    const maintenant = Date.now();
    await this.db.insert(session).values({
      id,
      utilisateurId,
      dateExpiration: new Date(maintenant + DELAIS.sessionJours * JOUR_MS),
      appareil: resumerAppareil(requete.headers['user-agent']),
      empreinteIp: requete.ip ? empreinteSalee(this.config.SEL_EMPREINTES, requete.ip) : null,
    });
    reponse.cookie(this.nomCookie, jeton, this.optionsCookie());
    return { id, utilisateurId };
  }

  /** Session portée par la requête, prolongée si besoin ; le cookie d'une session inconnue est effacé. */
  async retrouver(requete: Request, reponse: Response): Promise<SessionOuverte | null> {
    const jeton: unknown = requete.cookies?.[this.nomCookie];
    if (typeof jeton !== 'string' || !jeton) return null;

    const id = sha256(jeton);
    const [trouvee] = await this.db
      .select({
        id: session.id,
        utilisateurId: session.utilisateurId,
        derniereActivite: session.dateDerniereActivite,
      })
      .from(session)
      .innerJoin(utilisateur, eq(utilisateur.id, session.utilisateurId))
      .where(
        and(
          eq(session.id, id),
          gt(session.dateExpiration, new Date()),
          inArray(utilisateur.statutCompte, STATUTS_CONNECTABLES),
        ),
      );
    if (!trouvee) {
      reponse.clearCookie(this.nomCookie, this.optionsCookie(false));
      return null;
    }

    const maintenant = Date.now();
    if (maintenant - trouvee.derniereActivite.getTime() > PROLONGATION_MS) {
      await this.db
        .update(session)
        .set({
          dateDerniereActivite: new Date(maintenant),
          dateExpiration: new Date(maintenant + DELAIS.sessionJours * JOUR_MS),
        })
        .where(eq(session.id, id));
      reponse.cookie(this.nomCookie, jeton, this.optionsCookie());
    }
    return { id, utilisateurId: trouvee.utilisateurId };
  }

  /** F-03 : la déconnexion ferme la session de l'appareil courant. */
  async fermer(id: string, reponse: Response): Promise<void> {
    await this.db.delete(session).where(eq(session.id, id));
    reponse.clearCookie(this.nomCookie, this.optionsCookie(false));
  }

  /** Ferme toutes les sessions d'un membre (changement de mot de passe, bannissement), sauf éventuellement une. */
  async fermerToutes(utilisateurId: number, saufId?: string): Promise<void> {
    await this.db
      .delete(session)
      .where(
        and(eq(session.utilisateurId, utilisateurId), saufId ? ne(session.id, saufId) : undefined),
      );
  }

  private async fermerSiPresente(requete: Request): Promise<void> {
    const jeton: unknown = requete.cookies?.[this.nomCookie];
    if (typeof jeton === 'string' && jeton)
      await this.db.delete(session).where(eq(session.id, sha256(jeton)));
  }

  /** Cookie HttpOnly, SameSite=Lax, chemin / ; Secure et préfixe __Host- en production. */
  private optionsCookie(avecDuree = true): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(avecDuree ? { maxAge: DELAIS.sessionJours * JOUR_MS } : {}),
    };
  }
}
