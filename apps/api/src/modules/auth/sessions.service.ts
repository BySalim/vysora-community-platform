import { Inject, Injectable } from '@nestjs/common';
import { DELAIS } from '@vysora/shared';
import { and, eq, gt, notInArray } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { empreinteSalee, jetonAleatoire, sha256 } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { session, utilisateur } from '../../db/schema/index.js';
import { resumerAppareil } from './appareil.js';
import type { ContexteConnexion, SessionOuverte } from './requete.js';

/** L'expiration glissante n'est réécrite qu'une fois par heure au plus : pas d'écriture à chaque requête. */
const PROLONGATION_APRES_MS = 60 * 60_000;

const expirationDepuis = (instant: Date) =>
  new Date(instant.getTime() + DELAIS.sessionJours * 24 * 60 * 60_000);

/* ADR-0005 : sessions en base. Le navigateur garde le jeton (cookie HttpOnly) ; la base n'en garde
   que l'empreinte SHA-256, si bien qu'une copie de la base ne permet d'ouvrir aucune session. */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  async ouvrir(
    utilisateurId: number,
    contexte: ContexteConnexion,
    db: Executeur = this.db,
  ): Promise<{ jeton: string; expiration: Date }> {
    const jeton = jetonAleatoire();
    const expiration = expirationDepuis(new Date());
    await db.insert(session).values({
      id: sha256(jeton),
      utilisateurId,
      dateExpiration: expiration,
      appareil: resumerAppareil(contexte.userAgent),
      empreinteIp: contexte.ip ? empreinteSalee(this.config.SEL_EMPREINTES, contexte.ip) : null,
    });
    return { jeton, expiration };
  }

  /** Session valide pour ce jeton, avec son membre ; aucune pour un compte banni ou supprimé. */
  async retrouver(jeton: string): Promise<SessionOuverte | null> {
    const [ligne] = await this.db
      .select({
        id: session.id,
        dateExpiration: session.dateExpiration,
        dateDerniereActivite: session.dateDerniereActivite,
        deuxFacteursValide: session.deuxFacteursValide,
        utilisateur: {
          id: utilisateur.id,
          pseudo: utilisateur.pseudo,
          email: utilisateur.email,
          emailVerifie: utilisateur.emailVerifie,
          role: utilisateur.role,
          statutCompte: utilisateur.statutCompte,
          avatar: utilisateur.avatar,
        },
      })
      .from(session)
      .innerJoin(utilisateur, eq(utilisateur.id, session.utilisateurId))
      .where(
        and(
          eq(session.id, sha256(jeton)),
          gt(session.dateExpiration, new Date()),
          notInArray(utilisateur.statutCompte, ['BANNI', 'SUPPRIME']),
        ),
      )
      .limit(1);
    if (!ligne?.utilisateur.email) return null;
    return { ...ligne, utilisateur: { ...ligne.utilisateur, email: ligne.utilisateur.email } };
  }

  /** Expiration glissante (30 jours après la dernière activité) ; renvoie la nouvelle échéance si elle change. */
  async prolonger(ouverte: SessionOuverte, maintenant = new Date()): Promise<Date | null> {
    if (maintenant.getTime() - ouverte.dateDerniereActivite.getTime() < PROLONGATION_APRES_MS)
      return null;
    const expiration = expirationDepuis(maintenant);
    await this.db
      .update(session)
      .set({ dateDerniereActivite: maintenant, dateExpiration: expiration })
      .where(eq(session.id, ouverte.id));
    return expiration;
  }

  /** F-03 : déconnexion de l'appareil courant. */
  async fermer(jeton: string, db: Executeur = this.db): Promise<void> {
    await db.delete(session).where(eq(session.id, sha256(jeton)));
  }

  /** Toutes les sessions d'un membre (changement de mot de passe, suppression du compte, bannissement). */
  async fermerToutes(utilisateurId: number, db: Executeur = this.db): Promise<void> {
    await db.delete(session).where(eq(session.utilisateurId, utilisateurId));
  }
}
