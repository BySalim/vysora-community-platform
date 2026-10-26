/* EMAIL-01 : file des tâches différées (pg-boss, sur PostgreSQL, sans autre service). Une tâche est
   déclarée une fois, à l'initialisation de son module, puis publiée par les services (e-mails) ou
   lancée à heure fixe (nettoyages, purges, annonces). Une tâche en échec est reprise avec un délai
   croissant ; après la dernière reprise, l'échec est journalisé et la tâche reste en base, abandonnée,
   le temps de sa conservation. */

export interface DefinitionTache<T extends object = object> {
  /** Nom de la file : lettres, chiffres, points et tirets (« emails.envoyer »). */
  nom: string;
  /** Exécute une tâche ; une exception la fait reprendre plus tard : elle doit pouvoir être rejouée. */
  executer: (donnees: T) => Promise<void>;
  /** Reprises après le premier essai : délai avant la première, puis doublé à chaque reprise. */
  reprises: { nombre: number; delaiSecondes: number };
  /** Un essai qui dure davantage est tenu pour échoué, puis repris. */
  dureeMaximaleSecondes: number;
  /** Conservation d'une tâche terminée ou abandonnée, données comprises, avant sa suppression. */
  conservationSecondes: number;
  /** Tâches exécutées en même temps par cette instance de l'API (1 par défaut). */
  simultanees?: number;
  /** Expression cron, en UTC : la tâche est lancée, sans données, à chaque échéance. */
  planification?: string;
}

/** Nom de file accepté par pg-boss ; vérifié à la déclaration pour échouer au démarrage, pas à l'envoi. */
const NOM_TACHE = /^[\w.-]+$/;

/** Point d'entrée des modules : `FileTachesPgBoss` en fonctionnement, `FileTachesImmediate` en test. */
export abstract class FileTaches {
  protected readonly definitions = new Map<string, DefinitionTache>();

  /** Enregistre une tâche ; à appeler dans `onModuleInit`, avant le démarrage de la file. */
  declarer<T extends object>(definition: DefinitionTache<T>): void {
    if (!NOM_TACHE.test(definition.nom))
      throw new Error(`Nom de tâche invalide : « ${definition.nom} »`);
    if (this.definitions.has(definition.nom))
      throw new Error(`Tâche déclarée deux fois : « ${definition.nom} »`);
    this.definitions.set(definition.nom, definition as unknown as DefinitionTache);
  }

  /** Met une tâche en file : elle s'exécute après la réponse, avec ses reprises. */
  abstract publier<T extends object>(nom: string, donnees: T): Promise<void>;

  /** Plusieurs tâches du même nom, insérées en une fois (envois en nombre). */
  abstract publierPlusieurs<T extends object>(nom: string, donnees: T[]): Promise<void>;

  protected definition(nom: string): DefinitionTache {
    const definition = this.definitions.get(nom);
    if (!definition) throw new Error(`Tâche inconnue : « ${nom} »`);
    return definition;
  }
}
