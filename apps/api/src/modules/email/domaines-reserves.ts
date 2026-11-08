import type { Configuration } from '../../config/env.js';

/* DEMO-04 : domaines réservés aux essais et à la documentation (RFC 2606, RFC 6761). Aucune boîte
   n'y existe : en production, un e-mail adressé à l'un d'eux revient en erreur chez le service
   d'envoi, consomme son quota quotidien et abîme la réputation de l'expéditeur. Les membres de la
   démonstration chargée en préproduction (`pnpm db:demo`) ont tous une adresse `@example.test`. */

/** Domaines de premier niveau réservés (RFC 2606 § 2, RFC 6761 § 6). */
const NIVEAUX_RESERVES = ['test', 'example', 'invalid', 'localhost'];
/** Domaines de second niveau réservés à la documentation (RFC 2606 § 3). */
const DOMAINES_RESERVES = ['example.com', 'example.net', 'example.org'];

/** Domaine d'une adresse, en minuscules (« Awa <awa@Example.TEST> » → « example.test »), ou null. */
export function domaineAdresse(adresse: string): string | null {
  const brute = /<([^<>]*)>\s*$/.exec(adresse)?.[1] ?? adresse;
  const arobase = brute.lastIndexOf('@');
  if (arobase < 0) return null;
  const domaine = brute
    .slice(arobase + 1)
    .trim()
    .replace(/\.$/, '')
    .toLowerCase();
  return domaine || null;
}

/** Vrai si l'adresse appartient à un domaine réservé ou à l'un de ses sous-domaines. */
export function domaineReserve(adresse: string): boolean {
  const domaine = domaineAdresse(adresse);
  if (!domaine) return false;
  const niveau = domaine.slice(domaine.lastIndexOf('.') + 1);
  return (
    NIVEAUX_RESERVES.includes(niveau) ||
    DOMAINES_RESERVES.some((reserve) => domaine === reserve || domaine.endsWith(`.${reserve}`))
  );
}

/** Un e-mail part-il vers cette adresse ? En production, jamais vers un domaine réservé ; en
    développement et en test, toujours (Mailpit et les tests de bout en bout s'en servent). */
export const destinataireAccepte = (
  environnement: Configuration['NODE_ENV'],
  adresse: string,
): boolean => environnement !== 'production' || !domaineReserve(adresse);
