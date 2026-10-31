import type { ClassementsApi, MembreResumeApi, OutilResumeApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  adresseClassements,
  choixOutilHTML,
  laureatsHTML,
  progressionHTML,
  semainesHTML,
} from './rendu';

const membre = (nom: string, pseudo: string): MembreResumeApi =>
  ({
    id: pseudo.length,
    pseudo,
    nom,
    avatar: null,
    niveau: { code: 'apprenti', libelle: 'Apprenti' },
  }) as unknown as MembreResumeApi;
const claude: OutilResumeApi = {
  id: 2,
  nom: 'Claude',
  slug: 'claude',
  logo: null,
  logoMonochrome: false,
};

const donnees = (valeurs: Partial<ClassementsApi> = {}): ClassementsApi => ({
  semaines: [
    { debut: '2026-10-26', fin: '2026-11-01', statut: 'provisoire' },
    { debut: '2026-10-19', fin: '2026-10-25', statut: 'arretee' },
  ],
  semaine: { debut: '2026-10-26', fin: '2026-11-01', statut: 'provisoire' },
  chiffres: { votes: 0, reproductions: 0, casReussis: 0, reponsesAcceptees: 0, interactions: 0 },
  outils: [
    { id: 1, nom: 'ChatGPT', slug: 'chatgpt', logo: null, logoMonochrome: false, contributions: 3 },
  ],
  outil: null,
  palmares: { reussites: [], entraide: [], utiles: [], astuces: [] },
  membres: { semaine: [], general: [], classesSemaine: 0, classesGeneral: 0 },
  defi: null,
  progression: { niveaux: [], badges: [], badgesObtenus: 0 },
  moi: null,
  ...valeurs,
});

describe('classements, compléments (S-08)', () => {
  it('garde la semaine et l’outil dans l’adresse, l’adresse nue pour la semaine en cours', () => {
    expect(adresseClassements(null, null)).toBe('/classements');
    expect(adresseClassements('2026-10-19', 'claude')).toBe(
      '/classements?semaine=2026-10-19&outil=claude',
    );
    expect(semainesHTML(donnees({ outil: claude }))).toContain(
      'href="/classements?semaine=2026-10-19&amp;outil=claude"',
    );
  });

  it('propose l’outil choisi même sans contribution, et le marque choisi', () => {
    const html = choixOutilHTML(donnees({ outil: claude }));
    expect(html).toContain('data-cl-tool-href="/classements?outil=claude" aria-selected="true"');
    expect(html).toContain('Aucune contribution');
    expect(html).toContain('3 contributions');
    expect(html).toContain('class="cl-tool-btn is-set"');
  });

  it('présente six lauréats, dont le défi et la progression', () => {
    const html = laureatsHTML(
      donnees({
        outil: claude,
        progression: {
          niveaux: [
            {
              membre: membre('Karim Mansouri', 'karim'),
              de: 'artisan',
              vers: 'expert',
              reputation: 1600,
            },
          ],
          badges: [],
          badgesObtenus: 0,
        },
      }),
    );
    expect(html.match(/<li class="cl-laureate/g)).toHaveLength(6);
    expect(html).toContain('Aucun lauréat avec Claude');
    expect(html).toContain('Pas de défi cette semaine');
    expect(html).toContain('Passe Expert');
  });

  it('annonce les badges de la semaine au-delà des huit présentés', () => {
    const badge = {
      code: 'PREMIER_ESSAI',
      libelle: 'Premier essai',
      critere: 'Déclarer une première reproduction.',
      icone: 'repeat',
      ton: 'BLEU',
    } as ClassementsApi['progression']['badges'][number]['badge'];
    const html = progressionHTML(
      donnees({
        progression: {
          niveaux: [],
          badges: [{ membre: membre('Kofi Mensah', 'kofi'), badge, date: '2026-10-31T08:00:00Z' }],
          badgesObtenus: 17,
        },
      }),
    );
    expect(html).toContain('et 16 autres badges obtenus cette semaine');
    expect(html).toContain('31 octobre');
    expect(html.match(/Personne cette semaine/g)).toHaveLength(4);
  });
});
