import { Logger } from '@nestjs/common';
import pg from 'pg';
import { FileTachesPgBoss, SCHEMA_FILE } from '../src/modules/file/file-pg-boss.js';
import type { DefinitionTache } from '../src/modules/file/file-taches.js';

/* La vraie file (pg-boss) sur la base de test ; les autres tests de bout en bout utilisent la file
   immédiate (test/outils.ts). */

const url = (): string => {
  const adresse = process.env.DATABASE_URL;
  if (!adresse) throw new Error('DATABASE_URL manquante');
  return adresse;
};

/** Attend qu'une condition soit remplie (la file travaille en arrière-plan). */
async function attendre(condition: () => boolean, delaiMs = 15_000): Promise<void> {
  const fin = Date.now() + delaiMs;
  while (!condition()) {
    if (Date.now() > fin) throw new Error('Condition non remplie à temps');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

const definition = <T extends object>(
  valeurs: Partial<DefinitionTache<T>> & Pick<DefinitionTache<T>, 'nom'>,
): DefinitionTache<T> => ({
  executer: async () => {},
  reprises: { nombre: 0, delaiSecondes: 1 },
  dureeMaximaleSecondes: 30,
  conservationSecondes: 60,
  ...valeurs,
});

describe('File des tâches sur PostgreSQL (EMAIL-01, pg-boss)', () => {
  const ouvertes: FileTachesPgBoss[] = [];

  const ouvrir = (): FileTachesPgBoss => {
    const file = new FileTachesPgBoss({ DATABASE_URL: url() });
    file.intervalleSecondes = 0.5;
    ouvertes.push(file);
    return file;
  };

  afterEach(async () => {
    for (const file of ouvertes.splice(0)) await file.beforeApplicationShutdown();
    vi.restoreAllMocks();
  });

  it('exécute après coup les tâches publiées, une par une ou en nombre', async () => {
    const file = ouvrir();
    const recues: object[] = [];
    file.declarer(
      definition<{ n: number }>({
        nom: 'essai.recevoir',
        executer: async (donnees) => void recues.push(donnees),
      }),
    );
    await file.onApplicationBootstrap();

    await file.publier('essai.recevoir', { n: 1 });
    await file.publierPlusieurs('essai.recevoir', [{ n: 2 }, { n: 3 }]);
    await attendre(() => recues.length === 3);
    expect(recues).toEqual(expect.arrayContaining([{ n: 1 }, { n: 2 }, { n: 3 }]));
    await expect(file.publier('essai.inconnue', {})).rejects.toThrow(/inconnue/);
  }, 30_000);

  it('reprend une tâche en échec, puis journalise son abandon après le dernier essai', async () => {
    const avertissements = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const erreurs = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const file = ouvrir();
    let essais = 0;
    file.declarer(
      definition({
        nom: 'essai.echouer',
        reprises: { nombre: 1, delaiSecondes: 1 },
        executer: async () => {
          essais += 1;
          throw new Error('Serveur SMTP indisponible');
        },
      }),
    );
    await file.onApplicationBootstrap();

    await file.publier('essai.echouer', { secret: 'awa.sarr@example.com' });
    await attendre(() => erreurs.mock.calls.length > 0);
    expect(essais).toBe(2);
    expect(avertissements).toHaveBeenCalledWith(
      expect.objectContaining({ tache: 'essai.echouer', essai: 1 }),
      'Tâche essai.echouer en échec : nouvel essai prévu',
    );
    expect(erreurs).toHaveBeenCalledWith(
      expect.objectContaining({ tache: 'essai.echouer', essai: 2 }),
      'Tâche essai.echouer abandonnée après 2 essais',
    );
    // Les données de la tâche (adresses, liens) n'apparaissent jamais dans le journal.
    expect(JSON.stringify([...avertissements.mock.calls, ...erreurs.mock.calls])).not.toContain(
      'awa.sarr',
    );
  }, 30_000);

  it('planifie les tâches déclarées et retire les planifications que le code n’a plus', async () => {
    const lirePlanifications = async () => {
      const client = new pg.Client({ connectionString: url() });
      await client.connect();
      try {
        const { rows } = await client.query<{ name: string; cron: string; timezone: string }>(
          `select name, cron, timezone from ${SCHEMA_FILE}.schedule where name like 'essai.%' order by name`,
        );
        return rows;
      } finally {
        await client.end();
      }
    };

    const avant = ouvrir();
    avant.declarer(definition({ nom: 'essai.chaque-jour', planification: '0 5 * * *' }));
    avant.declarer(definition({ nom: 'essai.abandonnee', planification: '0 6 * * *' }));
    await avant.onApplicationBootstrap();
    expect(await lirePlanifications()).toEqual([
      { name: 'essai.abandonnee', cron: '0 6 * * *', timezone: 'UTC' },
      { name: 'essai.chaque-jour', cron: '0 5 * * *', timezone: 'UTC' },
    ]);
    await avant.beforeApplicationShutdown();

    const apres = ouvrir();
    apres.declarer(definition({ nom: 'essai.chaque-jour', planification: '15 5 * * *' }));
    apres.declarer(definition({ nom: 'essai.abandonnee' }));
    await apres.onApplicationBootstrap();
    expect(await lirePlanifications()).toEqual([
      { name: 'essai.chaque-jour', cron: '15 5 * * *', timezone: 'UTC' },
    ]);
  }, 30_000);
});
