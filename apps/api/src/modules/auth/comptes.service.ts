import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGES_MOT_DE_PASSE,
  estPseudoReserve,
  tirerPseudo,
  variantesPseudo,
  type DisponibilitePseudo,
  type Inscription,
  type SessionApi,
} from '@vysora/shared';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { conflit, erreurValidation, estViolationUnicite } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { acceptationDocument, utilisateur } from '../../db/schema/index.js';
import { documentsAAccepter } from './documents-legaux.js';
import { EtatVisiteurService } from './etat-visiteur.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import { SessionsService } from './sessions.service.js';

export const EMAIL_PRIS = 'Cette adresse est déjà associée à un compte Vysora.';
export const PSEUDO_PRIS = 'Ce pseudo vient d’être pris. Choisissez-en un autre.';

/* Création du compte (F-01) et choix du pseudo (RG-01), selon le parcours du prototype :
   adresse, mot de passe, puis pseudo proposé au hasard que le membre garde ou modifie. */
@Injectable()
export class ComptesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly etats: EtatVisiteurService,
  ) {}

  /** Crée le compte (e-mail à vérifier, RG-02), enregistre l'acceptation des documents (RG-03) et ouvre la session. */
  async inscrire(
    { email, motDePasse }: Inscription,
    requete: Request,
    reponse: Response,
  ): Promise<SessionApi> {
    if (await this.motsDePasse.estCompromis(motDePasse))
      throw erreurValidation({ motDePasse: MESSAGES_MOT_DE_PASSE.compromis });
    if (!(await this.emailDisponible(email))) throw conflit(undefined, { email: EMAIL_PRIS });

    const empreinte = await this.motsDePasse.hacher(motDePasse);
    const id = await this.creer(email, empreinte);
    await this.sessions.ouvrir(id, requete, reponse);
    return this.etats.pour(id);
  }

  async changerPseudo(utilisateurId: number, pseudo: string): Promise<SessionApi> {
    try {
      await this.db.update(utilisateur).set({ pseudo }).where(eq(utilisateur.id, utilisateurId));
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'utilisateur_pseudo_unique'))
        throw conflit(undefined, { pseudo: PSEUDO_PRIS });
      throw erreur;
    }
    return this.etats.pour(utilisateurId);
  }

  /** Le pseudo actuel du membre qui demande compte comme disponible. */
  async disponibilitePseudo(pseudo: string, utilisateurId?: number): Promise<DisponibilitePseudo> {
    if (!estPseudoReserve(pseudo) && !(await this.pseudosPris([pseudo], utilisateurId)).size)
      return { disponible: true, propositions: [] };
    const variantes = variantesPseudo(pseudo);
    const pris = await this.pseudosPris(variantes, utilisateurId);
    return {
      disponible: false,
      propositions: variantes.filter((variante) => !pris.has(variante.toLowerCase())),
    };
  }

  async emailDisponible(email: string): Promise<boolean> {
    const [trouve] = await this.db
      .select({ id: utilisateur.id })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.email}) = ${email.toLowerCase()}`);
    return !trouve;
  }

  /** Le pseudo tiré au hasard peut déjà exister : on retente avec un autre, dans une nouvelle transaction. */
  private async creer(email: string, empreinte: string): Promise<number> {
    for (let essai = 0; essai < 10; essai += 1) {
      try {
        return await this.db.transaction(async (tx) => {
          const [cree] = await tx
            .insert(utilisateur)
            .values({ pseudo: tirerPseudo(), email, empreinteMotDePasse: empreinte })
            .returning({ id: utilisateur.id });
          if (!cree) throw new Error('Compte non créé');
          const documents = await documentsAAccepter(tx);
          if (documents.length)
            await tx
              .insert(acceptationDocument)
              .values(documents.map((d) => ({ utilisateurId: cree.id, documentLegalId: d.id })));
          return cree.id;
        });
      } catch (erreur) {
        if (estViolationUnicite(erreur, 'utilisateur_email_unique'))
          throw conflit(undefined, { email: EMAIL_PRIS });
        if (!estViolationUnicite(erreur, 'utilisateur_pseudo_unique')) throw erreur;
      }
    }
    throw new Error('Aucun pseudo libre trouvé pour le nouveau compte');
  }

  /** Pseudos déjà utilisés parmi ceux demandés, en minuscules. */
  private async pseudosPris(pseudos: string[], saufUtilisateurId?: number): Promise<Set<string>> {
    if (!pseudos.length) return new Set();
    const bas = pseudos.map((pseudo) => pseudo.toLowerCase());
    const lignes = await this.db
      .select({ pseudo: sql<string>`lower(${utilisateur.pseudo})` })
      .from(utilisateur)
      .where(
        and(
          sql`lower(${utilisateur.pseudo}) in ${bas}`,
          saufUtilisateurId ? ne(utilisateur.id, saufUtilisateurId) : undefined,
        ),
      );
    return new Set(lignes.map((ligne) => ligne.pseudo));
  }
}
