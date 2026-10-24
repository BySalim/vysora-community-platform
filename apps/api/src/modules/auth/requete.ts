import type { Role, SessionApi, StatutCompte } from '@vysora/shared';
import type { Request } from 'express';

/* Ce que l'authentification ajoute à la requête : la session retrouvée à partir du cookie
   (ChargementSession), puis l'état du compte, calculé au plus une fois par requête. */

export interface UtilisateurConnecte {
  id: number;
  pseudo: string;
  /** Nom affiché (null : le pseudo s'affiche). */
  nomAffiche: string | null;
  email: string;
  emailVerifie: boolean;
  role: Role;
  statutCompte: StatutCompte;
  avatar: string | null;
}

export interface SessionOuverte {
  /** Empreinte SHA-256 du jeton : clé de la table session. */
  id: string;
  dateExpiration: Date;
  dateDerniereActivite: Date;
  /** ENF-05 : double authentification validée sur cette session. */
  deuxFacteursValide: boolean;
  utilisateur: UtilisateurConnecte;
}

export interface RequeteVysora extends Request {
  sessionOuverte?: SessionOuverte;
  etatSession?: Promise<SessionApi>;
}

/** Informations sur l'appareil, conservées avec la session (liste des appareils connectés). */
export interface ContexteConnexion {
  userAgent?: string;
  ip?: string;
}

export const contexteDe = (requete: Request): ContexteConnexion => ({
  userAgent: requete.headers['user-agent'],
  ip: requete.ip,
});
