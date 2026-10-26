import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AnnonceDocumentsService } from '../auth/annonce-documents.service.js';
import { FileTaches, type DefinitionTache } from '../file/file-taches.js';
import { MediasService } from '../medias/medias.service.js';
import { ConservationService } from './conservation.service.js';

/** Noms des tâches planifiées, dans la file et dans les journaux. */
export const TACHES_PLANIFIEES = {
  nettoyerMedias: 'medias.nettoyer',
  appliquerConservation: 'conservation.appliquer',
  annoncerDocuments: 'documents-legaux.annoncer',
} as const;

/** Réglages communs : trois reprises espacées de 5 minutes au moins, résultat gardé une semaine. */
const QUOTIDIENNE = {
  reprises: { nombre: 3, delaiSecondes: 300 },
  dureeMaximaleSecondes: 30 * 60,
  conservationSecondes: 7 * 24 * 3600,
} satisfies Partial<DefinitionTache>;

/* Tâches lancées à heure fixe par la file (EMAIL-01), en UTC. Chacune est rejouable : une échéance
   manquée ou reprise après un échec ne fait rien deux fois. Une nouvelle tâche s'ajoute ici, avec
   le service de son domaine. Viendront avec leurs données :
   - purge des vues de plus de 2 jours (INT-04, F-23, table `vue_contenu`) ;
   - comptes supprimés 30 jours après la demande, puis anonymisés (PARAM-01, RG-05, F-08) ;
   - fichiers d'export effacés 7 jours après leur production (PARAM-01, F-07). */
@Injectable()
export class TachesPlanifiees implements OnModuleInit {
  private readonly journal = new Logger(TachesPlanifiees.name);

  constructor(
    private readonly file: FileTaches,
    private readonly medias: MediasService,
    private readonly conservation: ConservationService,
    private readonly annonces: AnnonceDocumentsService,
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
  }
}
