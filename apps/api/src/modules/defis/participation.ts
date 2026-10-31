import { MESSAGES_PARTICIPATION, participationsOuvertes, type StatutDefi } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import type { Transaction } from '../../db/client.js';

/* Participation d'une création à un défi (F-64, RG-74, CI-15), contrôlée là où elle se décide : la page
   des défis (inscrire une création déjà publiée) et l'écriture des créations (publier un brouillon
   rattaché au défi, rattacher ou retirer une création publiée depuis l'éditeur). */

export interface DefiPublic {
  id: number;
  titre: string;
  statut: StatutDefi;
  dateDebut: Date;
  dateFin: Date;
}

/** Défi présenté au public (jamais un brouillon), verrouillé jusqu'à la fin de la transaction : les
    participations d'un même défi se décident l'une après l'autre (une par personne). */
export async function defiPublic(tx: Transaction, defiId: number): Promise<DefiPublic | null> {
  const { rows } = await tx.execute<{
    id: string;
    titre: string;
    statut: StatutDefi;
    date_debut: Date | string;
    date_fin: Date | string;
  }>(sql`
    select id, titre, statut, date_debut, date_fin from defi
    where id = ${defiId} and statut <> 'BROUILLON' for update`);
  const d = rows[0];
  return d
    ? {
        id: Number(d.id),
        titre: d.titre,
        statut: d.statut,
        dateDebut: new Date(d.date_debut),
        dateFin: new Date(d.date_fin),
      }
    : null;
}

/** Raison pour laquelle la création `creationId` de `auteurId`, publiée à `datePublication`, ne peut
    pas participer au défi (RG-74 : défi publié et en cours, publication pendant sa période, une
    participation par personne) ; null si elle le peut. */
export async function refusParticipation(
  tx: Transaction,
  p: {
    auteurId: number;
    creationId: number;
    defiId: number;
    datePublication: Date;
    maintenant: Date;
  },
): Promise<string | null> {
  const d = await defiPublic(tx, p.defiId);
  if (!d) return MESSAGES_PARTICIPATION.introuvable;
  if (!participationsOuvertes(d.statut, d.dateDebut, d.dateFin, p.maintenant))
    return MESSAGES_PARTICIPATION.fermees;
  if (p.datePublication < d.dateDebut || p.datePublication > d.dateFin)
    return MESSAGES_PARTICIPATION.periode;
  // Une participation est une création publiée ; un brouillon rattaché au défi n'en est pas encore une.
  const { rows } = await tx.execute<{ titre: string | null }>(sql`
    select cr.titre from creation cr join contenu c on c.id = cr.id
    where cr.defi_id = ${p.defiId} and c.auteur_id = ${p.auteurId} and cr.id <> ${p.creationId}
      and cr.statut_publication = 'PUBLIEE' and c.statut <> 'SUPPRIME'
    limit 1`);
  const autre = rows[0];
  return autre ? MESSAGES_PARTICIPATION.unique(autre.titre) : null;
}
