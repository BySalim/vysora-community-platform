import { Inject, Injectable } from '@nestjs/common';
import { DELAIS } from '@vysora/shared';
import { lt } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  audienceCompteur,
  audienceVisiteur,
  notification,
  parcoursVisite,
  passageAssistant,
  session,
  tentativeConnexion,
  vueContenu,
} from '../../db/schema/index.js';

export interface BilanConservation {
  sessions: number;
  tentatives: number;
  notifications: number;
  vues: number;
  passagesAssistants: number;
  compteursAudience: number;
  visiteursAudience: number;
  visitesSuivies: number;
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
    // F-23 : empreintes des vues, inutiles une fois le jour passé (seul le compteur reste).
    const limiteVues = new Date(maintenant.getTime() - DELAIS.conservationVuesJours * JOUR_MS)
      .toISOString()
      .slice(0, 10);
    const vues = await this.db.delete(vueContenu).where(lt(vueContenu.jour, limiteVues));
    // REF-03 : compteurs des assistants d'IA, 13 mois.
    const limitePassages = moisAvant(maintenant, DELAIS.conservationPassagesAssistantsMois)
      .toISOString()
      .slice(0, 10);
    const passages = await this.db
      .delete(passageAssistant)
      .where(lt(passageAssistant.jour, limitePassages));
    // LEG-03 : compteurs de la mesure d'audience (25 mois), empreintes des visiteurs du jour (2 jours),
    // visites suivies avec leurs étapes (3 mois après la dernière étape).
    const jourLimite = (date: Date) => date.toISOString().slice(0, 10);
    const compteurs = await this.db
      .delete(audienceCompteur)
      .where(
        lt(
          audienceCompteur.jour,
          jourLimite(moisAvant(maintenant, DELAIS.conservationAudienceMois)),
        ),
      );
    const visiteurs = await this.db
      .delete(audienceVisiteur)
      .where(
        lt(
          audienceVisiteur.jour,
          jourLimite(new Date(maintenant.getTime() - DELAIS.conservationVisiteursJours * JOUR_MS)),
        ),
      );
    const visites = await this.db
      .delete(parcoursVisite)
      .where(lt(parcoursVisite.derniere, moisAvant(maintenant, DELAIS.conservationParcoursMois)));
    return {
      compteursAudience: compteurs.rowCount ?? 0,
      visiteursAudience: visiteurs.rowCount ?? 0,
      visitesSuivies: visites.rowCount ?? 0,
      sessions: sessions.rowCount ?? 0,
      tentatives: tentatives.rowCount ?? 0,
      notifications: notifications.rowCount ?? 0,
      vues: vues.rowCount ?? 0,
      passagesAssistants: passages.rowCount ?? 0,
    };
  }
}
