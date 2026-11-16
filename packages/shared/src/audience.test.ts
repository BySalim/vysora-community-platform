import { describe, expect, it } from 'vitest';
import {
  audienceRefusee,
  choixCookiesAttendu,
  decrireAppareil,
  estRobot,
  lireChoixCookies,
  messageErreurNavigateur,
  parcoursAccepte,
  provenance,
  valeurChoixCookies,
} from './audience';

const choix = (audience: boolean, parcours: boolean) =>
  `vysora_consentement=${valeurChoixCookies({ audience, parcours, date: '2026-11-15' })}`;

describe('choix sur les cookies (LEG-03)', () => {
  it('écrit et relit le choix parmi les autres cookies', () => {
    expect(valeurChoixCookies({ audience: true, parcours: false, date: '2026-11-15' })).toBe(
      'v=1&audience=oui&parcours=non&date=2026-11-15',
    );
    expect(lireChoixCookies(`__Host-vysora_session=abc; ${choix(false, true)}`)).toEqual({
      version: 1,
      audience: false,
      parcours: true,
      date: '2026-11-15',
    });
  });

  it('tient pour absent un choix illisible', () => {
    expect(lireChoixCookies(null)).toBeNull();
    expect(lireChoixCookies('vysora_consentement=')).toBeNull();
    expect(
      lireChoixCookies('vysora_consentement=v=1&audience=peut-etre&parcours=non&date=2026-11-15'),
    ).toBeNull();
    expect(lireChoixCookies('vysora_consentement=v=1&audience=oui&parcours=non')).toBeNull();
    expect(
      lireChoixCookies('autre_vysora_consentement=v=1&audience=oui&parcours=oui&date=2026-11-15'),
    ).toBeNull();
  });

  it('attend un choix tant qu’aucun de la version en cours n’est retenu', () => {
    expect(choixCookiesAttendu(undefined)).toBe(true);
    expect(choixCookiesAttendu('vysora_audience=refusee')).toBe(true);
    expect(choixCookiesAttendu(choix(true, false))).toBe(false);
  });

  it('ne compte pas l’audience d’un refus, nouveau ou ancien (LEG-02)', () => {
    expect(audienceRefusee(null)).toBe(false);
    expect(audienceRefusee('')).toBe(false);
    expect(audienceRefusee('vysora_audience=refusee')).toBe(true);
    expect(audienceRefusee('__Host-vysora_session=abc; vysora_audience=refusee')).toBe(true);
    expect(audienceRefusee('vysora_audience=oui')).toBe(false);
    expect(audienceRefusee('autre_vysora_audience=refusee')).toBe(false);
    expect(audienceRefusee(choix(false, false))).toBe(true);
    // Le choix exprimé dans le bandeau remplace l'ancien refus.
    expect(audienceRefusee(`vysora_audience=refusee; ${choix(true, false)}`)).toBe(false);
  });

  it('ne suit un parcours qu’avec l’accord de la version en cours', () => {
    expect(parcoursAccepte(undefined)).toBe(false);
    expect(parcoursAccepte(choix(true, false))).toBe(false);
    expect(parcoursAccepte(choix(false, true))).toBe(true);
    expect(
      parcoursAccepte('vysora_consentement=v=0&audience=oui&parcours=oui&date=2026-01-01'),
    ).toBe(false);
  });
});

describe('appareils et robots (LEG-03)', () => {
  it('range les navigateurs courants dans de grandes familles', () => {
    expect(
      decrireAppareil(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
      ),
    ).toEqual({ appareil: 'ORDINATEUR', navigateur: 'CHROME', systeme: 'WINDOWS' });
    expect(
      decrireAppareil(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ appareil: 'MOBILE', navigateur: 'SAFARI', systeme: 'IOS' });
    expect(
      decrireAppareil(
        'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Safari/537.36',
      ),
    ).toEqual({ appareil: 'TABLETTE', navigateur: 'SAMSUNG', systeme: 'ANDROID' });
    expect(
      decrireAppareil(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0',
      ),
    ).toEqual({ appareil: 'ORDINATEUR', navigateur: 'EDGE', systeme: 'MACOS' });
    expect(
      decrireAppareil(
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
      ),
    ).toEqual({ appareil: 'ORDINATEUR', navigateur: 'FIREFOX', systeme: 'LINUX' });
    expect(decrireAppareil(null)).toEqual({
      appareil: 'ORDINATEUR',
      navigateur: 'AUTRE',
      systeme: 'AUTRE',
    });
  });

  it('écarte robots, programmes et robots des assistants, pas les personnes qui en viennent', () => {
    expect(estRobot(undefined)).toBe(true);
    expect(estRobot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(estRobot('curl/8.5.0')).toBe(true);
    expect(estRobot('Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0')).toBe(true);
    expect(estRobot('Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Safari/537.36')).toBe(false);
  });
});

describe('provenance (LEG-03)', () => {
  it('garde le domaine d’arrivée, la campagne ou l’accès direct', () => {
    expect(provenance('https://www.google.com/search?q=vysora', null, 'vysora.site')).toBe(
      'google.com',
    );
    expect(provenance('https://l.facebook.com/', null, 'vysora.site')).toBe('facebook.com');
    expect(provenance(null, null, 'vysora.site')).toBe('(direct)');
    expect(provenance('pas une adresse', null, 'vysora.site')).toBe('(direct)');
    expect(provenance('https://chatgpt.com/', 'Lettre-Novembre', 'vysora.site')).toBe(
      'lettre-novembre',
    );
    expect(provenance(null, '<script>', 'vysora.site')).toBe('(direct)');
  });

  it('ne compte pas une page ouverte depuis le site comme une arrivée', () => {
    expect(provenance('https://vysora.site/explorer', null, 'vysora.site')).toBeNull();
    expect(provenance('http://localhost:4321/', null, 'localhost')).toBeNull();
  });
});

describe('messageErreurNavigateur (LEG-03)', () => {
  it('retire paramètres, identifiants et espaces superflus', () => {
    expect(
      messageErreurNavigateur(
        'Failed to fetch https://vysora.site/api/v1/creations?jeton=abc123 for item  12345678\n  at x',
      ),
    ).toBe('Failed to fetch https://vysora.site/api/v1/creations for item … at x');
    expect(messageErreurNavigateur('x'.repeat(300))).toHaveLength(160);
  });
});
