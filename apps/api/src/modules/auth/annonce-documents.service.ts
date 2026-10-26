import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, lt, lte, notExists } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { acceptationDocument, documentLegal, utilisateur } from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { emailNouvellesVersions } from './courriels.js';
import { dateDuJour, type DocumentLegal } from './documents-legaux.service.js';

export interface BilanAnnonce {
  /** Versions annoncées (une seule par document : la plus récente). */
  documents: number;
  emails: number;
}

/** Versions à annoncer parmi celles entrées en vigueur sans annonce : pour chaque document, la plus
    récente, si une version antérieure existe (la première version s'accepte à l'inscription). */
export function versionsAAnnoncer(
  enAttente: DocumentLegal[],
  toutes: Pick<DocumentLegal, 'type' | 'dateEffet'>[],
): DocumentLegal[] {
  const parType = new Map<DocumentLegal['type'], DocumentLegal>();
  for (const version of enAttente) {
    const retenue = parType.get(version.type);
    if (!retenue || version.dateEffet > retenue.dateEffet) parType.set(version.type, version);
  }
  return [...parType.values()].filter((version) =>
    toutes.some((autre) => autre.type === version.type && autre.dateEffet < version.dateEffet),
  );
}

/* RG-90, WF-03 : à la date d'effet d'une nouvelle version d'un document légal, un e-mail en informe
   les membres actifs. Lancé chaque jour par la file (EMAIL-01) ; une version annoncée est datée
   (`document_legal.date_annonce`) et ne l'est jamais deux fois. */
@Injectable()
export class AnnonceDocumentsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly emails: EmailService,
  ) {}

  async annoncer(maintenant = new Date()): Promise<BilanAnnonce> {
    return this.db.transaction(async (tx) => {
      // Lignes verrouillées : une seconde exécution attend, puis ne trouve plus rien à annoncer.
      const enAttente = await tx
        .select()
        .from(documentLegal)
        .where(
          and(
            isNull(documentLegal.dateAnnonce),
            lte(documentLegal.dateEffet, dateDuJour(maintenant)),
          ),
        )
        .for('update');
      if (!enAttente.length) return { documents: 0, emails: 0 };
      const toutes = await tx
        .select({ type: documentLegal.type, dateEffet: documentLegal.dateEffet })
        .from(documentLegal);
      const versions = versionsAAnnoncer(enAttente, toutes);

      const parMembre = new Map<number, { email: string; versions: DocumentLegal[] }>();
      for (const version of versions)
        for (const membre of await this.destinataires(tx, version)) {
          const entree = parMembre.get(membre.id) ?? { email: membre.email, versions: [] };
          entree.versions.push(version);
          parMembre.set(membre.id, entree);
        }
      // Mises en file avant la date d'annonce : si la transaction échoue ensuite, la tâche est
      // reprise et l'annonce renvoyée plutôt que perdue.
      await this.emails.envoyerPlusieurs(
        [...parMembre.values()].map((entree) =>
          emailNouvellesVersions(entree.email, entree.versions, this.config.SITE_URL),
        ),
      );
      // Une version dépassée avant d'avoir été annoncée ne le sera plus.
      await tx
        .update(documentLegal)
        .set({ dateAnnonce: maintenant })
        .where(
          inArray(
            documentLegal.id,
            enAttente.map((version) => version.id),
          ),
        );
      return { documents: versions.length, emails: parMembre.size };
    });
  }

  /** Membres actifs, d'adresse vérifiée, inscrits avant la date d'effet, qui n'ont pas déjà accepté
      cette version (acceptée le jour même, avant l'annonce). */
  private async destinataires(
    tx: Transaction,
    version: DocumentLegal,
  ): Promise<{ id: number; email: string }[]> {
    const lignes = await tx
      .select({ id: utilisateur.id, email: utilisateur.email })
      .from(utilisateur)
      .where(
        and(
          eq(utilisateur.statutCompte, 'ACTIF'),
          eq(utilisateur.emailVerifie, true),
          lt(utilisateur.dateInscription, new Date(`${version.dateEffet}T00:00:00Z`)),
          notExists(
            tx
              .select({ un: acceptationDocument.utilisateurId })
              .from(acceptationDocument)
              .where(
                and(
                  eq(acceptationDocument.utilisateurId, utilisateur.id),
                  eq(acceptationDocument.documentLegalId, version.id),
                ),
              ),
          ),
        ),
      );
    return lignes.flatMap((ligne) => (ligne.email ? [{ id: ligne.id, email: ligne.email }] : []));
  }
}
