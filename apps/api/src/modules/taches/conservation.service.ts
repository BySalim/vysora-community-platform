import { Inject, Injectable } from '@nestjs/common';
import { DELAIS } from '@vysora/shared';
import { lt } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { notification, session, tentativeConnexion } from '../../db/schema/index.js';

export interface BilanConservation {
  sessions: number;
  tentatives: number;
  notifications: number;
}

const JOUR_MS = 24 * 3600_000;

/** Même jour, `mois` mois plus tôt (UTC). */
const moisAvant = (date: Date, mois: number): Date => {
  const resultat = new Date(date);
  resultat.setUTCMonth(resultat.getUTCMonth() - mois);
  return resultat;
};

/* Durées de conservation annoncées par la politique de confidentialité (section « Durées de
   conservation ») et purges techniques, appliquées chaque jour par la file (EMAIL-01). Chaque purge
   est une seule requête, rejouable sans effet de bord. */
@Injectable()
export class ConservationService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async appliquer(maintenant = new Date()): Promise<BilanConservation> {
    // Une session expirée ne rouvre plus rien (ADR-0005) ; la connexion reste tracée dans les tentatives.
    const sessions = await this.db.delete(session).where(lt(session.dateExpiration, maintenant));
    // « Sécuriser le service » : empreinte de l'adresse IP, dates de connexion et tentatives, 1 an.
    const limiteConnexions = new Date(
      maintenant.getTime() - DELAIS.conservationConnexionsJours * JOUR_MS,
    );
    const tentatives = await this.db
      .delete(tentativeConnexion)
      .where(lt(tentativeConnexion.date, limiteConnexions));
    // « Vous informer » : notifications, 12 mois.
    const notifications = await this.db
      .delete(notification)
      .where(lt(notification.date, moisAvant(maintenant, DELAIS.conservationNotificationsMois)));
    return {
      sessions: sessions.rowCount ?? 0,
      tentatives: tentatives.rowCount ?? 0,
      notifications: notifications.rowCount ?? 0,
    };
  }
}
