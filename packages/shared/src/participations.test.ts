import { describe, expect, it } from 'vitest';
import { controlerJeu, schemaParticipation, TAILLE_MAX_JEU } from './schemas/participations';

/* Participations aux défis (S-17) : contrôle du jeu avant publication, le même dans la page et
   dans l'API (ADR-0011). */
const PAGE =
  '<!doctype html><html><head></head><body><canvas></canvas><script>1</script></body></html>';
const etats = (nom: string, html: string) => controlerJeu(nom, html).lignes.map((l) => l.etat);

describe('controlerJeu', () => {
  it('accepte une page HTML autonome', () => {
    expect(etats('jeu.html', PAGE)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
    expect(controlerJeu('jeu.html', PAGE).bloquants).toEqual([]);
  });

  it('refuse un autre fichier, une page trop lourde, un mot de passe, du minage', () => {
    expect(controlerJeu('jeu.txt', PAGE).bloquants).toEqual([
      'Choisissez un fichier .html qui contient la page du jeu.',
    ]);
    expect(controlerJeu('jeu.html', PAGE + ' '.repeat(TAILLE_MAX_JEU)).bloquants[0]).toMatch(
      /200 000 caractères/,
    );
    expect(controlerJeu('jeu.html', `${PAGE}<input type="password">`).bloquants[0]).toMatch(
      /mot de passe/,
    );
    expect(
      controlerJeu('jeu.html', `${PAGE}<script src="https://coinhive.com/lib.js"></script>`)
        .bloquants[0],
    ).toMatch(/minage/);
  });

  it('prévient des appels à Internet, des redirections et du code masqué sans les refuser', () => {
    const r = controlerJeu(
      'jeu.html',
      `${PAGE}<script src="https://cdn.example.com/a.js"></script><script>fetch("https://api.example.com/x"); window.open("x"); eval(atob("YQ=="));</script>`,
    );
    expect(r.bloquants).toEqual([]);
    expect(r.lignes.map((l) => l.etat)).toEqual([
      'ok',
      'ok',
      'ok',
      'attention',
      'attention',
      'attention',
    ]);
    expect(r.avertissements[0]).toMatch(/cdn\.example\.com, api\.example\.com/);
  });
});

describe('schemaParticipation', () => {
  const saisie = {
    titre: 'Hotfix Hero',
    idee: 'Un runner en pixel art où l’horloge sert de niveau.',
    outilId: 1,
    prompts: ['Écris un runner complet dans un seul fichier HTML.'],
    jeu: { nom: 'jeu.html', html: PAGE },
  };

  it('demande un jeu ou une image, et refuse un jeu bloqué', () => {
    expect(schemaParticipation.safeParse(saisie).success).toBe(true);
    const sansRien = schemaParticipation.safeParse({ ...saisie, jeu: null });
    expect(sansRien.error?.issues[0]?.message).toBe(
      'Ajoutez votre jeu (fichier HTML) ou une image.',
    );
    expect(schemaParticipation.safeParse({ ...saisie, jeu: null, couvertureId: 3 }).success).toBe(
      true,
    );
    const bloque = schemaParticipation.safeParse({
      ...saisie,
      jeu: { nom: 'jeu.html', html: `${PAGE}<input type=password>` },
    });
    expect(bloque.error?.issues[0]?.path).toEqual(['jeu']);
  });

  it('demande une idée de 20 caractères et dix prompts au plus', () => {
    expect(
      schemaParticipation.safeParse({ ...saisie, idee: 'Court' }).error?.issues[0]?.message,
    ).toBe('L’idée compte au moins 20 caractères.');
    expect(
      schemaParticipation.safeParse({ ...saisie, prompts: Array(11).fill('Encore un prompt.') })
        .success,
    ).toBe(false);
  });
});
