import { FileTachesImmediate } from './file-immediate.js';
import { journaliserEchec, optionsFile } from './file-pg-boss.js';
import type { DefinitionTache } from './file-taches.js';

const definition = (valeurs: Partial<DefinitionTache> = {}): DefinitionTache => ({
  nom: 'emails.envoyer',
  executer: async () => {},
  reprises: { nombre: 6, delaiSecondes: 30 },
  dureeMaximaleSecondes: 120,
  conservationSecondes: 3600,
  ...valeurs,
});

describe('File des tâches (EMAIL-01)', () => {
  it('reprend une tâche avec un délai croissant et la garde le temps prévu', () => {
    expect(optionsFile(definition())).toEqual({
      retryLimit: 6,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 120,
      deleteAfterSeconds: 3600,
    });
  });

  it('journalise un échec comme une reprise tant qu’il reste des essais, puis comme un abandon', () => {
    const journal = { warn: vi.fn(), error: vi.fn() };
    const erreur = new Error('Connexion SMTP refusée');
    const essai = { id: 'a1', name: 'emails.envoyer', retryLimit: 2 };

    expect(journaliserEchec(journal, { ...essai, retryCount: 0 }, erreur)).toBe('reprise');
    expect(journaliserEchec(journal, { ...essai, retryCount: 1 }, erreur)).toBe('reprise');
    expect(journal.error).not.toHaveBeenCalled();
    expect(journaliserEchec(journal, { ...essai, retryCount: 2 }, erreur)).toBe('abandon');
    expect(journal.error).toHaveBeenCalledWith(
      { err: erreur, tache: 'emails.envoyer', id: 'a1', essai: 3 },
      'Tâche emails.envoyer abandonnée après 3 essais',
    );
  });

  it('refuse un nom invalide ou une tâche déclarée deux fois', () => {
    const file = new FileTachesImmediate();
    expect(() => file.declarer(definition({ nom: 'emails envoyer' }))).toThrow(/invalide/);
    file.declarer(definition());
    expect(() => file.declarer(definition())).toThrow(/deux fois/);
  });

  it('exécute aussitôt en test, et refuse une tâche inconnue', async () => {
    const file = new FileTachesImmediate();
    const recues: object[] = [];
    file.declarer(definition({ executer: async (donnees) => void recues.push(donnees) }));
    file.declarer(definition({ nom: 'medias.nettoyer', planification: '30 3 * * *' }));

    await file.publier('emails.envoyer', { chiffre: 'a' });
    await file.publierPlusieurs('emails.envoyer', [{ chiffre: 'b' }, { chiffre: 'c' }]);
    expect(recues).toEqual([{ chiffre: 'a' }, { chiffre: 'b' }, { chiffre: 'c' }]);
    expect(file.planification('medias.nettoyer')).toBe('30 3 * * *');
    await expect(file.publier('inconnue', {})).rejects.toThrow(/inconnue/);
  });
});
