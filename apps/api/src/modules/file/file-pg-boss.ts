import {
  Inject,
  Injectable,
  Logger,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { PgBoss, type JobWithMetadata, type Queue } from 'pg-boss';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { FileTaches, type DefinitionTache } from './file-taches.js';

/** Schéma PostgreSQL de pg-boss, créé et mis à jour par pg-boss lui-même au démarrage. */
export const SCHEMA_FILE = 'pgboss';

type JournalEchecs = Pick<Logger, 'warn' | 'error'>;
type EssaiTache = Pick<JobWithMetadata, 'id' | 'name' | 'retryCount' | 'retryLimit'>;

/** Options de la file pg-boss tirées d'une définition (héritées par chaque tâche publiée). */
export function optionsFile(definition: DefinitionTache): Omit<Queue, 'name'> {
  return {
    retryLimit: definition.reprises.nombre,
    retryDelay: definition.reprises.delaiSecondes,
    retryBackoff: true,
    expireInSeconds: definition.dureeMaximaleSecondes,
    deleteAfterSeconds: definition.conservationSecondes,
  };
}

/** Journalise l'échec d'un essai : nouvel essai prévu (avertissement) ou abandon (erreur). Les données
    de la tâche ne sont jamais journalisées : elles portent des adresses, des liens, des messages. */
export function journaliserEchec(
  journal: JournalEchecs,
  essai: EssaiTache,
  erreur: unknown,
): 'reprise' | 'abandon' {
  const contexte = { err: erreur, tache: essai.name, id: essai.id, essai: essai.retryCount + 1 };
  if (essai.retryCount >= essai.retryLimit) {
    journal.error(contexte, `Tâche ${essai.name} abandonnée après ${essai.retryCount + 1} essais`);
    return 'abandon';
  }
  journal.warn(contexte, `Tâche ${essai.name} en échec : nouvel essai prévu`);
  return 'reprise';
}

/* La file en fonctionnement : pg-boss dans la base de l'API (schéma `pgboss`). Les tâches sont
   exécutées par l'API elle-même ; plusieurs instances se partagent la file sans doublon, et une
   échéance planifiée ne lance qu'une tâche, quel que soit le nombre d'instances. */
@Injectable()
export class FileTachesPgBoss
  extends FileTaches
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly journal = new Logger('FileTaches');
  private boss?: PgBoss;
  /** Attente entre deux recherches de tâches, en secondes (réduite par les tests). */
  intervalleSecondes = 2;

  constructor(@Inject(CONFIG) private readonly config: Pick<Configuration, 'DATABASE_URL'>) {
    super();
  }

  async publier<T extends object>(nom: string, donnees: T): Promise<void> {
    this.definition(nom);
    await this.demarree().send(nom, donnees);
  }

  async publierPlusieurs<T extends object>(nom: string, donnees: T[]): Promise<void> {
    this.definition(nom);
    if (donnees.length)
      await this.demarree().insert(
        nom,
        donnees.map((data) => ({ data })),
      );
  }

  /** Après l'initialisation de tous les modules : chaque tâche déclarée a sa file, son exécutant et
      sa planification ; une planification retirée du code est retirée de la base. */
  async onApplicationBootstrap(): Promise<void> {
    const boss = new PgBoss({
      connectionString: this.config.DATABASE_URL,
      schema: SCHEMA_FILE,
      application_name: 'vysora-file',
      max: 4,
    });
    boss.on('error', (erreur) =>
      this.journal.error({ err: erreur }, 'Erreur de la file de tâches'),
    );
    boss.on('warning', (avertissement) =>
      this.journal.warn({ avertissement }, 'Avertissement de la file de tâches'),
    );
    await boss.start();
    this.boss = boss;

    for (const definition of this.definitions.values()) {
      const options = optionsFile(definition);
      // createQueue ne modifie pas une file existante : updateQueue applique les réglages du code.
      await boss.createQueue(definition.nom, options);
      await boss.updateQueue(definition.nom, options);
      await boss.work(
        definition.nom,
        {
          includeMetadata: true,
          localConcurrency: definition.simultanees ?? 1,
          pollingIntervalSeconds: this.intervalleSecondes,
        },
        async ([essai]) => {
          if (!essai) return;
          try {
            await definition.executer(essai.data ?? {});
          } catch (erreur) {
            journaliserEchec(this.journal, essai, erreur);
            throw erreur;
          }
        },
      );
      if (definition.planification)
        // « once » : une échéance manquée pendant un arrêt (déploiement) est rattrapée au redémarrage.
        await boss.schedule(definition.nom, definition.planification, null, {
          tz: 'UTC',
          missed: 'once',
        });
    }
    for (const planification of await boss.getSchedules())
      if (!this.definitions.get(planification.name)?.planification)
        await boss.unschedule(planification.name, planification.key);
  }

  /** Avant la fermeture des connexions : les tâches en cours se terminent (10 secondes au plus). */
  async beforeApplicationShutdown(): Promise<void> {
    await this.boss?.stop({ graceful: true, timeout: 10_000 });
    this.boss = undefined;
  }

  private demarree(): PgBoss {
    if (!this.boss) throw new Error('La file de tâches n’est pas démarrée');
    return this.boss;
  }
}
