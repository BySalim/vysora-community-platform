import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGES_MOT_DE_PASSE,
  champPseudo,
  estPseudoReserve,
  tirerPseudo,
  variantesPseudo,
  type DisponibiliteEmail,
  type DisponibilitePseudo,
  type Inscription,
  type ModificationMembre,
} from '@vysora/shared';
import { and, eq, ne, sql } from 'drizzle-orm';
import { conflit, erreurValidation, estViolationUnicite } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { utilisateur } from '../../db/schema/index.js';
import { DocumentsLegauxService } from './documents-legaux.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import type { ContexteConnexion } from './requete.js';
import { SessionsService } from './sessions.service.js';
import { VerificationEmailService } from './verification-email.service.js';

export const MESSAGES_COMPTE = {
  emailPris: 'Cette adresse est déjà associée à un compte Vysora.',
  pseudoPris: 'Ce pseudo est déjà pris.',
  pseudoReserve: 'Ce pseudo est réservé. Choisissez-en un autre.',
} as const;

/* Comptes (F-01, WF-01) : inscription par e-mail, disponibilité du pseudo et de l'adresse,
   modification du pseudo. RG-01 : pseudo unique sans distinction de casse ; RG-02 : e-mail unique. */
@Injectable()
export class ComptesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly documents: DocumentsLegauxService,
    private readonly verification: VerificationEmailService,
  ) {}

  /** Compte ACTIF, e-mail non vérifié (lecture seule, RG-02), rôle MEMBRE ; acceptations datées (RG-03) ;
      session ouverte ; lien de vérification envoyé (AUTH-02). */
  async inscrire(
    saisie: Inscription,
    contexte: ContexteConnexion,
  ): Promise<{ utilisateurId: number; jeton: string; expiration: Date }> {
    if (saisie.pseudo && estPseudoReserve(saisie.pseudo))
      throw erreurValidation({ pseudo: MESSAGES_COMPTE.pseudoReserve });
    // RG-04 : le contrôle local a eu lieu dans le schéma ; la base des fuites connues complète.
    if (await this.motsDePasse.estDansUneFuite(saisie.motDePasse))
      throw erreurValidation({ motDePasse: MESSAGES_MOT_DE_PASSE.compromis });

    const erreurs: Record<string, string> = {};
    if (await this.emailPris(saisie.email)) erreurs.email = MESSAGES_COMPTE.emailPris;
    if (saisie.pseudo && (await this.pseudoPris(saisie.pseudo)))
      erreurs.pseudo = MESSAGES_COMPTE.pseudoPris;
    if (Object.keys(erreurs).length) throw conflit(undefined, erreurs);

    const empreinte = await this.motsDePasse.hacher(saisie.motDePasse);
    for (let essai = 0; essai < 5; essai += 1) {
      const pseudo = saisie.pseudo ?? (await this.pseudoLibre());
      try {
        const cree = await this.db.transaction(async (tx) => {
          const [nouveau] = await tx
            .insert(utilisateur)
            .values({
              pseudo,
              email: saisie.email,
              empreinteMotDePasse: empreinte,
              dateDerniereConnexion: new Date(),
            })
            .returning({ id: utilisateur.id });
          if (!nouveau) throw new Error('Compte non créé');
          await this.documents.accepterEnVigueur(nouveau.id, tx);
          const session = await this.sessions.ouvrir(nouveau.id, contexte, tx);
          return { utilisateurId: nouveau.id, ...session };
        });
        await this.verification.envoyer(cree.utilisateurId, saisie.email);
        return cree;
      } catch (erreur) {
        // Inscriptions simultanées : l'unicité est garantie par la base (RG-01, RG-02).
        if (estViolationUnicite(erreur, 'utilisateur_email_unique'))
          throw conflit(undefined, { email: MESSAGES_COMPTE.emailPris });
        if (!estViolationUnicite(erreur, 'utilisateur_pseudo_unique')) throw erreur;
        if (saisie.pseudo) throw conflit(undefined, { pseudo: MESSAGES_COMPTE.pseudoPris });
      }
    }
    throw new Error('Impossible d’attribuer un pseudo libre au nouveau compte');
  }

  /** Première étape de l'inscription (prototype) : l'adresse est-elle déjà associée à un compte ? */
  async disponibiliteEmail(email: string): Promise<DisponibiliteEmail> {
    return { disponible: !(await this.emailPris(email)) };
  }

  /** RG-01 : format, pseudos réservés, unicité ; variantes libres proposées sinon. */
  async disponibilitePseudo(saisi: string, utilisateurId?: number): Promise<DisponibilitePseudo> {
    const format = champPseudo.safeParse(saisi);
    if (!format.success)
      return { pseudo: saisi, disponible: false, motif: 'format', propositions: [] };
    const pseudo = format.data;
    const motif = estPseudoReserve(pseudo)
      ? 'reserve'
      : (await this.pseudoPris(pseudo, utilisateurId))
        ? 'pris'
        : null;
    if (!motif) return { pseudo, disponible: true, motif: null, propositions: [] };
    return {
      pseudo,
      disponible: false,
      motif,
      propositions: await this.libres(variantesPseudo(pseudo)),
    };
  }

  /** Le membre modifie ses informations : son pseudo, son nom, son fuseau horaire ; son adresse tant
      qu'elle n'est pas vérifiée. */
  async modifier(utilisateurId: number, modification: ModificationMembre): Promise<void> {
    if (modification.pseudo !== undefined)
      await this.modifierPseudo(utilisateurId, modification.pseudo);
    if (modification.nomAffiche !== undefined)
      await this.db
        .update(utilisateur)
        .set({ nomAffiche: modification.nomAffiche })
        .where(eq(utilisateur.id, utilisateurId));
    if (modification.fuseauHoraire !== undefined)
      await this.db
        .update(utilisateur)
        .set({ fuseauHoraire: modification.fuseauHoraire })
        .where(eq(utilisateur.id, utilisateurId));
    if (modification.email !== undefined)
      await this.modifierEmail(utilisateurId, modification.email);
  }

  private async modifierPseudo(utilisateurId: number, pseudo: string): Promise<void> {
    if (estPseudoReserve(pseudo)) throw erreurValidation({ pseudo: MESSAGES_COMPTE.pseudoReserve });
    if (await this.pseudoPris(pseudo, utilisateurId))
      throw conflit(undefined, { pseudo: MESSAGES_COMPTE.pseudoPris });
    try {
      await this.db.update(utilisateur).set({ pseudo }).where(eq(utilisateur.id, utilisateurId));
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'utilisateur_pseudo_unique'))
        throw conflit(undefined, { pseudo: MESSAGES_COMPTE.pseudoPris });
      throw erreur;
    }
  }

  /** Écran « Confirmez votre adresse » : une faute de frappe se corrige avant la vérification, et un
      nouveau lien part à la bonne adresse. Une adresse vérifiée se change depuis les paramètres (PARAM-01). */
  private async modifierEmail(utilisateurId: number, email: string): Promise<void> {
    const [compte] = await this.db
      .select({ email: utilisateur.email, emailVerifie: utilisateur.emailVerifie })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (compte?.emailVerifie)
      throw conflit('Votre adresse est déjà confirmée : modifiez-la depuis vos paramètres.');
    if (compte?.email?.toLowerCase() !== email.toLowerCase()) {
      if (await this.emailPris(email))
        throw conflit(undefined, { email: MESSAGES_COMPTE.emailPris });
      try {
        await this.db.update(utilisateur).set({ email }).where(eq(utilisateur.id, utilisateurId));
      } catch (erreur) {
        if (estViolationUnicite(erreur, 'utilisateur_email_unique'))
          throw conflit(undefined, { email: MESSAGES_COMPTE.emailPris });
        throw erreur;
      }
    }
    await this.verification.envoyer(utilisateurId, email);
  }

  private async emailPris(email: string): Promise<boolean> {
    const n = await this.db.$count(utilisateur, sql`lower(${utilisateur.email}) = lower(${email})`);
    return n > 0;
  }

  private async pseudoPris(pseudo: string, saufUtilisateurId?: number): Promise<boolean> {
    const n = await this.db.$count(
      utilisateur,
      and(
        sql`lower(${utilisateur.pseudo}) = lower(${pseudo})`,
        saufUtilisateurId === undefined ? undefined : ne(utilisateur.id, saufUtilisateurId),
      ),
    );
    return n > 0;
  }

  /** Candidats qui ne sont pris par aucun membre. */
  private async libres(candidats: string[]): Promise<string[]> {
    if (!candidats.length) return [];
    const pris = await this.db
      .select({ pseudo: sql<string>`lower(${utilisateur.pseudo})` })
      .from(utilisateur)
      .where(
        sql`lower(${utilisateur.pseudo}) in (${sql.join(
          candidats.map((candidat) => sql`${candidat.toLowerCase()}`),
          sql`, `,
        )})`,
      );
    const occupes = new Set(pris.map((ligne) => ligne.pseudo));
    return candidats.filter((candidat) => !occupes.has(candidat.toLowerCase()));
  }

  /** Pseudo proposé à la création du compte (« prisme-azur-42 »), que le membre peut ensuite modifier. */
  private async pseudoLibre(): Promise<string> {
    for (let essai = 0; essai < 10; essai += 1) {
      const [libre] = await this.libres([tirerPseudo()]);
      if (libre) return libre;
    }
    return `${tirerPseudo()}${Math.floor(Math.random() * 1000)}`;
  }
}
