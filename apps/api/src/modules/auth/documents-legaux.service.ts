import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { acceptationDocument, documentLegal } from '../../db/schema/index.js';

export type DocumentLegal = typeof documentLegal.$inferSelect;

/** Date du jour au format des dates d'effet (AAAA-MM-JJ, UTC). */
export const dateDuJour = (maintenant = new Date()): string =>
  maintenant.toISOString().slice(0, 10);

/* F-04 : documents légaux versionnés. La politique de confidentialité informe sans s'accepter
   (acceptation_requise = false, comme dans le prototype) ; les CGU et la charte s'acceptent. */
@Injectable()
export class DocumentsLegauxService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  /** RG-112 : pour chaque document, la version la plus récente dont la date d'effet est passée. */
  async enVigueur(aujourdhui = dateDuJour()): Promise<DocumentLegal[]> {
    const versions = await this.db
      .select()
      .from(documentLegal)
      .where(lte(documentLegal.dateEffet, aujourdhui))
      .orderBy(desc(documentLegal.dateEffet));
    const parType = new Map<DocumentLegal['type'], DocumentLegal>();
    for (const version of versions)
      if (!parType.has(version.type)) parType.set(version.type, version);
    return [...parType.values()];
  }

  /** RG-03 : versions en vigueur à accepter que le membre n'a pas encore acceptées. */
  async aAccepter(utilisateurId: number): Promise<DocumentLegal[]> {
    const requis = (await this.enVigueur()).filter((document) => document.acceptationRequise);
    if (!requis.length) return [];
    const acceptes = await this.db
      .select({ id: acceptationDocument.documentLegalId })
      .from(acceptationDocument)
      .where(
        and(
          eq(acceptationDocument.utilisateurId, utilisateurId),
          inArray(
            acceptationDocument.documentLegalId,
            requis.map((document) => document.id),
          ),
        ),
      );
    const dejaAcceptes = new Set(acceptes.map((acceptation) => acceptation.id));
    return requis.filter((document) => !dejaAcceptes.has(document.id));
  }

  /** RG-03 : enregistre, datée, l'acceptation de chaque version en vigueur qui s'accepte. */
  async accepterEnVigueur(utilisateurId: number, db: Executeur = this.db): Promise<void> {
    const requis = (await this.enVigueur()).filter((document) => document.acceptationRequise);
    if (!requis.length) return;
    await db
      .insert(acceptationDocument)
      .values(requis.map((document) => ({ utilisateurId, documentLegalId: document.id })))
      .onConflictDoNothing();
  }
}
