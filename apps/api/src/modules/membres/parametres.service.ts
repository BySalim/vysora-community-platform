import { Inject, Injectable } from '@nestjs/common';
import { NIVEAUX, type ParametresApi } from '@vysora/shared';
import { and, count, eq, ne } from 'drizzle-orm';
import { introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { contenu, creation, utilisateur } from '../../db/schema/index.js';
import { ChangementEmailService } from '../auth/changement-email.service.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import { FournisseursOAuth } from '../auth/fournisseurs-oauth.js';
import type { SessionOuverte } from '../auth/requete.js';
import { ServicesExternesService } from '../auth/services-externes.service.js';
import { SessionsService } from '../auth/sessions.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ExportService } from './export.service.js';

/* PARAM-01 (EC-17, F-06) : tout ce que la page Paramètres affiche, en une réponse. */
@Injectable()
export class ParametresService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly etatCompte: EtatCompteService,
    private readonly sessions: SessionsService,
    private readonly changementEmail: ChangementEmailService,
    private readonly notifications: NotificationsService,
    private readonly exports: ExportService,
    private readonly fournisseurs: FournisseursOAuth,
    private readonly servicesExternes: ServicesExternesService,
  ) {}

  async lire(ouverte: SessionOuverte, maintenant = new Date()): Promise<ParametresApi> {
    const id = ouverte.utilisateur.id;
    const [compte] = await this.db.select().from(utilisateur).where(eq(utilisateur.id, id));
    if (!compte?.email) throw introuvable();
    const [
      etat,
      changement,
      appareils,
      notifications,
      exportDonnees,
      creationsPubliees,
      comptesExternes,
    ] = await Promise.all([
      this.etatCompte.calculer(ouverte),
      this.changementEmail.enAttente(id, maintenant),
      this.sessions.lister(id, ouverte.id, maintenant),
      this.notifications.preferences(id),
      this.exports.etat(id, compte.pseudo, maintenant),
      this.db
        .select({ n: count() })
        .from(creation)
        .innerJoin(contenu, eq(contenu.id, creation.id))
        .where(
          and(
            eq(contenu.auteurId, id),
            eq(creation.statutPublication, 'PUBLIEE'),
            ne(contenu.statut, 'SUPPRIME'),
          ),
        )
        .then(([ligne]) => ligne?.n ?? 0),
      this.servicesExternes.liste(id),
    ]);
    const niveau = NIVEAUX.find((n) => n.code === etat.etat.niveau) ?? NIVEAUX[0];
    return {
      pseudo: compte.pseudo,
      nom: compte.nomAffiche ?? compte.pseudo,
      email: compte.email,
      emailVerifie: compte.emailVerifie,
      changementEmail: changement
        ? { email: changement.email, envoyeLe: changement.envoyeLe.toISOString() }
        : null,
      fuseauHoraire: compte.fuseauHoraire,
      role: compte.role,
      niveau: { code: niveau?.code ?? 'curieux', libelle: niveau?.libelle ?? 'Curieux' },
      points: etat.membre?.points ?? 0,
      dateInscription: compte.dateInscription.toISOString(),
      motDePasseModifieLe: compte.dateMotDePasse?.toISOString() ?? null,
      motDePasse: Boolean(compte.empreinteMotDePasse),
      servicesOuverts: this.fournisseurs.ouverts(),
      comptesExternes,
      appareils,
      notifications,
      export: exportDonnees,
      creationsPubliees,
    };
  }
}
