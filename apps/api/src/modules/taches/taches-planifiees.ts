import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AnnonceDocumentsService } from '../auth/annonce-documents.service.js';
import { FileTaches, type DefinitionTache } from '../file/file-taches.js';
import { MediasService } from '../medias/medias.service.js';
import { SuppressionService } from '../membres/suppression.service.js';
import { ConservationService } from './conservation.service.js';

/** Noms des tâches planifiées, dans la file et dans les journaux. */
export const TACHES_PLANIFIEES = {
  nettoyerMedias: 'medias.nettoyer',
  appliquerConservation: 'conservation.appliquer',
  annoncerDocuments: 'documents-legaux.annoncer',
  supprimerComptes: 'comptes.supprimer',
} as const;

/** Réglages communs : trois reprises espacées de 5 minutes au moins, résultat gardé une semaine. */
const QUOTIDIENNE = {
  reprises: { nombre: 3, delaiSecondes: 300 },
  dureeMaximaleSecondes: 30 * 60,
  conservationSecondes: 7 * 24 * 3600,
} satisfies Partial<DefinitionTache>;

/* Tâches lancées à heure fixe par la file (EMAIL-01), en UTC. Chacune est rejouable : une échéance
   manquée ou reprise après un échec ne fait rien deux fois. Une nouvelle tâche s'ajoute ici, avec
   le service de son domaine. Les tâches d'un domaine qui tournent souvent ou à la demande se
   déclarent avec leur service : e-mails (`emails.envoyer`), e-mails des notifications
   (`notifications.emails`, chaque minute), préparation des exports (`exports.preparer`). */
@Injectable()
export class TachesPlanifiees implements OnModuleInit {
  private readonly journal = new Logger(TachesPlanifiees.name);

  constructor(
    private readonly file: FileTaches,
    private readonly medias: MediasService,
    private readonly conservation: ConservationService,
    private readonly annonces: AnnonceDocumentsService,
    private readonly suppressions: SuppressionService,
  ) {}

  onModuleInit(): void {
    // MEDIA-01 : images jamais enregistrées depuis 24 heures, fichiers qu'aucune ligne ne désigne.
    this.file.declarer({
      nom: TACHES_PLANIFIEES.nettoyerMedias,
      planification: '30 3 * * *',
      ...QUOTIDIENNE,
      executer: async () => {
        const bilan = await this.medias.nettoyer();
        this.journal.log({ bilan }, 'Nettoyage des images terminé');
      },
    });
    // Durées de conservation de la politique de confidentialité.
    this.file.declarer({
      nom: TACHES_PLANIFIEES.appliquerConservation,
      planification: '0 4 * * *',
      ...QUOTIDIENNE,
      executer: async () => {
        const bilan = await this.conservation.appliquer();
        this.journal.log({ bilan }, 'Durées de conservation appliquées');
      },
    });
    // RG-90, WF-03 : le matin du jour d'effet (8 h UTC), pas au milieu de la nuit.
    this.file.declarer({
      nom: TACHES_PLANIFIEES.annoncerDocuments,
      planification: '0 8 * * *',
      ...QUOTIDIENNE,
      executer: async () => {
        const bilan = await this.annonces.annoncer();
        if (bilan.documents)
          this.journal.log({ bilan }, 'Nouvelles versions des documents légaux annoncées');
      },
    });
    // RG-05, F-08 : comptes dont la demande de suppression a 30 jours sans reconnexion.
    this.file.declarer({
      nom: TACHES_PLANIFIEES.supprimerComptes,
      planification: '30 4 * * *',
      ...QUOTIDIENNE,
      executer: async () => {
        const bilan = await this.suppressions.appliquer();
        if (bilan.comptes) this.journal.log({ bilan }, 'Comptes supprimés');
      },
    });
  }
}
