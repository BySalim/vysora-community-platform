import type { Configuration } from '../../config/env.js';

/** Nom du cookie de session : préfixe __Host- en production (HTTPS, sans domaine, chemin /). */
export const nomCookieSession = (config: Pick<Configuration, 'NODE_ENV'>): string =>
  config.NODE_ENV === 'production' ? '__Host-vysora_session' : 'vysora_session';
