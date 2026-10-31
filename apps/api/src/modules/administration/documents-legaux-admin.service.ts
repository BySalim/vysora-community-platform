import { Inject, Injectable } from '@nestjs/common';
import {
  TYPES_DOCUMENT_LEGAL,
  type DocumentLegalAdministreApi,
  type SaisieVersionDocumentLegal,
  type VersionDocumentAdministreeApi,
} from '@vysora/shared';
import { count, desc, eq } from 'drizzle-orm';
import {
  conflit,
  erreurValidation,
  estViolationUnicite,
  introuvable,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { acceptationDocument, documentLegal } from '../../db/schema/index.js';
import { dateLongue } from '../auth/courriels.js';
import { dateDuJour } from '../auth/documents-legaux.service.js';
import { auditer } from './journal-audit.js';

/* Documents légaux (ADM-02, EC-25, F-04, RG-112) : une nouvelle version prend effet à sa date ; elle
   remplace alors la précédente, son acceptation est exigée (RG-03) et les membres en sont prévenus
   par e-mail (RG-90, tâche documents-legaux.annoncer). Les versions antérieures et leurs acceptations
   sont conservées. Le texte de chaque document est celui de sa page sur le site (LEG-01). */
@Injectable()
export class DocumentsLegauxAdminService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async documents(aujourdhui = dateDuJour()): Promise<DocumentLegalAdministreApi[]> {
    const [versions, acceptations] = await Promise.all([
      this.db
        .select()
        .from(documentLegal)
        .orderBy(desc(documentLegal.dateEffet), desc(documentLegal.id)),
      this.db
        .select({ id: acceptationDocument.documentLegalId, nombre: count() })
        .from(acceptationDocument)
        .groupBy(acceptationDocument.documentLegalId),
    ]);
    const acceptees = new Map(acceptations.map((a) => [a.id, a.nombre]));
    return TYPES_DOCUMENT_LEGAL.flatMap((type) => {
      const duType = versions.filter((v) => v.type === type);
      const enVigueur = duType.find((v) => v.dateEffet <= aujourdhui);
      const derniere = duType[0];
      if (!derniere) return [];
      return [
        {
          type,
          url: derniere.url,
          acceptationRequise: derniere.acceptationRequise,
          versions: duType.map((v): VersionDocumentAdministreeApi => {
            const nombre = acceptees.get(v.id) ?? 0;
            const etat =
              v.dateEffet > aujourdhui ? 'a-venir' : v === enVigueur ? 'en-vigueur' : 'remplacee';
            return {
              id: v.id,
              version: v.version,
              dateEffet: v.dateEffet,
              resumeChangements: v.resumeChangements,
              etat,
              dateAnnonce: v.dateAnnonce?.toISOString() ?? null,
              acceptations: nombre,
              retirable: etat === 'a-venir' && !v.dateAnnonce && nombre === 0,
            };
          }),
        },
      ];
    });
  }

  /** Nouvelle version, nommée par sa date d'effet : aujourd'hui au plus tôt, et après la dernière. */
  async publier(
    adminId: number,
    saisie: SaisieVersionDocumentLegal,
    aujourdhui = dateDuJour(),
  ): Promise<DocumentLegalAdministreApi[]> {
    if (saisie.dateEffet < aujourdhui)
      throw erreurValidation({
        dateEffet:
          'Choisissez aujourd’hui ou une date à venir : une version ne s’applique pas au passé.',
      });
    await this.db.transaction(async (tx) => {
      // Verrou sur les versions du document : deux publications simultanées s'ordonnent.
      const [derniere] = await tx
        .select()
        .from(documentLegal)
        .where(eq(documentLegal.type, saisie.type))
        .orderBy(desc(documentLegal.dateEffet))
        .for('update');
      if (!derniere) throw introuvable('Ce document est introuvable.');
      if (saisie.dateEffet <= derniere.dateEffet)
        throw erreurValidation({
          dateEffet: `La dernière version prend effet le ${dateLongue(derniere.dateEffet)} : choisissez une date postérieure.`,
        });
      try {
        const [creee] = await tx
          .insert(documentLegal)
          .values({
            type: saisie.type,
            version: saisie.dateEffet,
            dateEffet: saisie.dateEffet,
            url: derniere.url,
            acceptationRequise: derniere.acceptationRequise,
            resumeChangements: saisie.resumeChangements,
          })
          .returning({ id: documentLegal.id });
        await auditer(tx, adminId, 'DOCUMENT_LEGAL_PUBLIE', 'document_legal', creee!.id, {
          type: saisie.type,
          version: saisie.dateEffet,
        });
      } catch (erreur) {
        if (estViolationUnicite(erreur))
          throw conflit('Une version de ce document porte déjà cette date.');
        throw erreur;
      }
    });
    return this.documents(aujourdhui);
  }

  /** Retire une version publiée par erreur, tant qu'elle n'a pas pris effet ni été annoncée. */
  async retirer(
    adminId: number,
    id: number,
    aujourdhui = dateDuJour(),
  ): Promise<DocumentLegalAdministreApi[]> {
    await this.db.transaction(async (tx) => {
      const [version] = await tx
        .select()
        .from(documentLegal)
        .where(eq(documentLegal.id, id))
        .for('update');
      if (!version) throw introuvable('Cette version est introuvable.');
      const [{ nombre } = { nombre: 0 }] = await tx
        .select({ nombre: count() })
        .from(acceptationDocument)
        .where(eq(acceptationDocument.documentLegalId, id));
      if (version.dateEffet <= aujourdhui || version.dateAnnonce || nombre > 0)
        throw conflit(
          'Cette version a pris effet : elle reste dans l’historique. Publiez une nouvelle version pour la remplacer.',
        );
      await tx.delete(documentLegal).where(eq(documentLegal.id, id));
      await auditer(tx, adminId, 'DOCUMENT_LEGAL_RETIRE', 'document_legal', id, {
        type: version.type,
        version: version.version,
      });
    });
    return this.documents(aujourdhui);
  }
}
