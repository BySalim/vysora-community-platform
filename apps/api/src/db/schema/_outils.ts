import { sql } from 'drizzle-orm';
import { bigint, check, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

/* Briques communes du schéma. Les noms de colonnes sont déduits des propriétés
   (camelCase → snake_case, option `casing` de Drizzle). */

/** Clé primaire numérique non signifiante (MCD, section 2.1). */
export const identifiant = () =>
  bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity();

/** Clé étrangère vers une clé primaire numérique. */
export const reference = () => bigint({ mode: 'number' });

/** Date et heure en UTC (type DH du MCD). */
export const horodatage = () => timestamp({ withTimezone: true, mode: 'date' });

const listeSql = (valeurs: readonly string[]) =>
  sql.raw(valeurs.map((valeur) => `'${valeur.replaceAll("'", "''")}'`).join(', '));

/** Contrainte CHECK qui limite une colonne texte à une liste fermée (valeurs de @vysora/shared). */
export const valeursPermises = (nom: string, colonne: AnyPgColumn, valeurs: readonly string[]) =>
  check(nom, sql`${colonne} in (${listeSql(valeurs)})`);
