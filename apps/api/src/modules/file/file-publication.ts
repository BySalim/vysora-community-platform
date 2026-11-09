import { PgBoss } from 'pg-boss';
import type { Configuration } from '../../config/env.js';
import { SCHEMA_FILE } from './file-pg-boss.js';
import { FileTaches } from './file-taches.js';

/* File en publication seule, pour une commande lancée à côté de l'API (db/administrateur.ts) : la
   tâche est déposée dans la file de l'API, qui l'exécute. Ni exécutant, ni planification, ni
   maintenance : la file et son schéma existent déjà, créés par l'API à son démarrage. */
export class FileTachesPublication extends FileTaches {
  private boss?: PgBoss;

  constructor(private readonly config: Pick<Configuration, 'DATABASE_URL'>) {
    super();
  }

  async demarrer(): Promise<void> {
    const boss = new PgBoss({
      connectionString: this.config.DATABASE_URL,
      schema: SCHEMA_FILE,
      application_name: 'vysora-commande',
      max: 1,
      supervise: false,
      schedule: false,
      migrate: false,
      createSchema: false,
    });
    boss.on('error', (erreur) => console.error('Erreur de la file de tâches :', erreur));
    await boss.start();
    this.boss = boss;
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

  async arreter(): Promise<void> {
    await this.boss?.stop({ graceful: false });
    this.boss = undefined;
  }

  private demarree(): PgBoss {
    if (!this.boss) throw new Error('La file de tâches n’est pas démarrée');
    return this.boss;
  }
}
