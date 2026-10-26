import { Injectable } from '@nestjs/common';
import { FileTaches } from './file-taches.js';

/* La file des tests : une tâche publiée s'exécute aussitôt, dans l'appel qui la publie, sans
   reprise ; une erreur remonte à l'appelant. Les e-mails sont donc reçus par le double du transport
   dès la réponse de l'API. Les tâches planifiées se lancent à la demande (`lancer`). */
@Injectable()
export class FileTachesImmediate extends FileTaches {
  async publier<T extends object>(nom: string, donnees: T): Promise<void> {
    await this.definition(nom).executer(donnees);
  }

  async publierPlusieurs<T extends object>(nom: string, donnees: T[]): Promise<void> {
    for (const element of donnees) await this.publier(nom, element);
  }

  /** Lance une tâche planifiée comme le ferait son échéance. */
  async lancer(nom: string): Promise<void> {
    await this.definition(nom).executer({});
  }

  /** Expression cron d'une tâche, ou undefined si elle n'est pas planifiée. */
  planification(nom: string): string | undefined {
    return this.definition(nom).planification;
  }
}
