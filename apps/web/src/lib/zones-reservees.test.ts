import type { EtatVisiteur } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import { accueilZone, zoneReservee, zoneVisible } from './zones-reservees';

const etat = (session: EtatVisiteur['session'], role: EtatVisiteur['role']): EtatVisiteur => ({
  session,
  role,
  niveau: 'curieux',
  compte: 'actif',
});

describe('zones réservées à l’équipe', () => {
  it('reconnaît l’administration et la modération, et rien d’autre', () => {
    expect(zoneReservee('/admin/roles')).toBe('administration');
    expect(zoneReservee('/admin')).toBe('administration');
    expect(zoneReservee('/moderation/signalements/12')).toBe('moderation');
    expect(zoneReservee('/administrateurs')).toBeNull();
    expect(zoneReservee('/forum/admin')).toBeNull();
    expect(zoneReservee('/')).toBeNull();
  });

  it('n’existe pas pour un visiteur ni pour un membre', () => {
    for (const zone of ['administration', 'moderation'] as const) {
      expect(zoneVisible(zone, etat('visiteur', 'membre'))).toBe(false);
      expect(zoneVisible(zone, etat('membre', 'membre'))).toBe(false);
    }
  });

  it('s’ouvre au rôle de la zone : la modération aux modérateurs et administrateurs', () => {
    expect(zoneVisible('moderation', etat('membre', 'moderateur'))).toBe(true);
    expect(zoneVisible('moderation', etat('membre', 'admin'))).toBe(true);
    expect(zoneVisible('administration', etat('membre', 'admin'))).toBe(true);
    expect(zoneVisible('administration', etat('membre', 'moderateur'))).toBe(false);
  });

  it('mène « /admin » et « /moderation » à l’accueil de la zone', () => {
    expect(accueilZone('/admin')).toBe('administration');
    expect(accueilZone('/admin/')).toBe('administration');
    expect(accueilZone('/moderation')).toBe('moderation');
    expect(accueilZone('/admin/roles')).toBeNull();
  });
});
