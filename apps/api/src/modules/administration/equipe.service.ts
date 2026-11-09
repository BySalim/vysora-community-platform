import { Inject, Injectable } from '@nestjs/common';
import {
  LONGUEURS,
  estPseudoReserve,
  slugifier,
  tirerPseudo,
  type ActionAudit,
  type AjoutEquipe,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { journalAudit, utilisateur } from '../../db/schema/index.js';
import { ActivationService, activationEnAttente } from '../auth/activation.service.js';
import type { Acteur } from './administration.service.js';

export const MESSAGES_EQUIPE = {
  emailPris:
    'Cette adresse est déjà associée à un compte Vysora : recherchez-la dans la liste pour changer son rôle.',
  compteFerme: 'Cette adresse appartient à un compte banni ou en cours de suppression.',
  dejaActive: 'Ce compte est déjà activé : la personne se connecte avec son mot de passe.',
  adresseNonConfirmee:
    'Ce compte n’a pas encore confirmé son adresse : la personne doit d’abord ouvrir le lien reçu à l’inscription.',
} as const;

/** Issue de l'ajout d'un membre de l'équipe : compte créé, ou lien d'activation renvoyé à un compte
    qui ne l'a pas encore utilisé. */
export interface AjoutMembreEquipe {
  id: number;
  pseudo: string;
  issue: 'cree' | 'lien-renvoye';
}

/** Commande du serveur : le compte est aussi nommé administrateur s'il existait déjà, actif et
    confirmé ; ou il l'était déjà. */
export interface NominationAdministrateur {
  id: number;
  pseudo: string;
  issue: AjoutMembreEquipe['issue'] | 'promu' | 'deja-administrateur';
}

type Compte = Pick<
  typeof utilisateur.$inferSelect,
  'id' | 'pseudo' | 'nomAffiche' | 'role' | 'statutCompte' | 'emailVerifie' | 'empreinteMotDePasse'
> & { email: string };

/* ADM-03 : comptes de l'équipe. Un membre de l'équipe ne passe pas par l'inscription publique : un
   administrateur crée son compte depuis l'écran des rôles, avec son adresse, son nom et son rôle ; le
   tout premier administrateur, par une commande sur le serveur (db/administrateur.ts). Le compte n'a
   ni mot de passe ni adresse confirmée : la personne l'active depuis le lien reçu (ActivationService),
   puis configure la vérification en deux étapes à sa première connexion (SEC-02). Chaque création,
   chaque lien renvoyé et chaque nomination est inscrit au journal d'audit (ENF-09). */
@Injectable()
export class EquipeService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Pick<Configuration, 'SEL_EMPREINTES'>,
    private readonly activation: ActivationService,
  ) {}

  /** POST /api/v1/admin/equipe. Une adresse déjà inscrite est refusée (son rôle se change dans la
      liste), sauf si son compte attend encore son activation : le rôle et le nom sont mis à jour, et un
      nouveau lien remplace le précédent. */
  async ajouter(acteur: Acteur | null, saisie: AjoutEquipe): Promise<AjoutMembreEquipe> {
    const existant = await this.compteDe(saisie.email);
    if (existant) {
      if (!activationEnAttente(existant)) throw this.refusCompteExistant(existant);
      await this.db.transaction(async (tx) => {
        await tx
          .update(utilisateur)
          .set({ role: saisie.role, nomAffiche: saisie.nom })
          .where(eq(utilisateur.id, existant.id));
        await this.auditer(tx, acteur, 'ACTIVATION_RENVOYEE', existant.id, {
          role: saisie.role,
        });
      });
      await this.activation.envoyer({
        id: existant.id,
        email: existant.email,
        nom: saisie.nom,
        role: saisie.role,
      });
      return { id: existant.id, pseudo: existant.pseudo, issue: 'lien-renvoye' };
    }

    const cree = await this.creer(acteur, saisie);
    await this.activation.envoyer({
      ...cree,
      email: saisie.email,
      nom: saisie.nom,
      role: saisie.role,
    });
    return { id: cree.id, pseudo: cree.pseudo, issue: 'cree' };
  }

  /** POST /api/v1/admin/membres/:id/activation : nouveau lien pour un compte pas encore activé. */
  async renvoyerActivation(acteur: Acteur, membreId: number): Promise<void> {
    const [compte] = await this.db.select().from(utilisateur).where(eq(utilisateur.id, membreId));
    if (!compte?.email || compte.statutCompte === 'SUPPRIME')
      throw introuvable('Ce membre est introuvable.');
    if (compte.statutCompte !== 'ACTIF') throw conflit(MESSAGES_EQUIPE.compteFerme);
    if (!activationEnAttente(compte)) throw conflit(MESSAGES_EQUIPE.dejaActive);
    await this.auditer(this.db, acteur, 'ACTIVATION_RENVOYEE', compte.id, { role: compte.role });
    await this.activation.envoyer({
      id: compte.id,
      email: compte.email,
      nom: compte.nomAffiche ?? compte.pseudo,
      role: compte.role,
    });
  }

  /** Commande du serveur (premier administrateur, ou plus aucun administrateur joignable) : crée le
      compte comme `ajouter`, ou nomme administrateur un compte existant, actif et confirmé. Le
      journal d'audit l'inscrit sans auteur. */
  async nommerAdministrateur(email: string, nom: string): Promise<NominationAdministrateur> {
    const existant = await this.compteDe(email);
    if (!existant || activationEnAttente(existant))
      return this.ajouter(null, { email, nom, role: 'ADMINISTRATEUR' });
    if (existant.statutCompte !== 'ACTIF') throw conflit(MESSAGES_EQUIPE.compteFerme);
    if (!existant.emailVerifie) throw conflit(MESSAGES_EQUIPE.adresseNonConfirmee);
    if (existant.role === 'ADMINISTRATEUR')
      return { id: existant.id, pseudo: existant.pseudo, issue: 'deja-administrateur' };
    await this.db.transaction(async (tx) => {
      await tx
        .update(utilisateur)
        .set({ role: 'ADMINISTRATEUR' })
        .where(eq(utilisateur.id, existant.id));
      await this.auditer(tx, null, 'ROLE_MODIFIE', existant.id, {
        avant: existant.role,
        apres: 'ADMINISTRATEUR',
      });
    });
    return { id: existant.id, pseudo: existant.pseudo, issue: 'promu' };
  }

  private refusCompteExistant(compte: Compte) {
    return compte.statutCompte === 'ACTIF'
      ? conflit(undefined, { email: MESSAGES_EQUIPE.emailPris })
      : conflit(undefined, { email: MESSAGES_EQUIPE.compteFerme });
  }

  private async compteDe(email: string): Promise<Compte | null> {
    const [compte] = await this.db
      .select({
        id: utilisateur.id,
        pseudo: utilisateur.pseudo,
        nomAffiche: utilisateur.nomAffiche,
        email: utilisateur.email,
        role: utilisateur.role,
        statutCompte: utilisateur.statutCompte,
        emailVerifie: utilisateur.emailVerifie,
        empreinteMotDePasse: utilisateur.empreinteMotDePasse,
      })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.email}) = lower(${email})`)
      .limit(1);
    return compte?.email ? { ...compte, email: compte.email } : null;
  }

  /** Compte sans mot de passe ni adresse confirmée ; pseudo tiré du nom (RG-01), que la personne
      pourra changer dans ses paramètres. */
  private async creer(
    acteur: Acteur | null,
    { email, nom, role }: AjoutEquipe,
  ): Promise<{ id: number; pseudo: string }> {
    const candidats = this.pseudosPour(nom);
    const pris = await this.db
      .select({ pseudo: sql<string>`lower(${utilisateur.pseudo})` })
      .from(utilisateur)
      .where(
        sql`lower(${utilisateur.pseudo}) in (${sql.join(
          candidats.map((candidat) => sql`${candidat}`),
          sql`, `,
        )})`,
      );
    const occupes = new Set(pris.map((ligne) => ligne.pseudo));
    for (const pseudo of candidats.filter((candidat) => !occupes.has(candidat))) {
      try {
        return await this.db.transaction(async (tx) => {
          const [nouveau] = await tx
            .insert(utilisateur)
            .values({ pseudo, nomAffiche: nom, email, role })
            .returning({ id: utilisateur.id, pseudo: utilisateur.pseudo });
          if (!nouveau) throw new Error('Compte non créé');
          await this.auditer(tx, acteur, 'MEMBRE_EQUIPE_AJOUTE', nouveau.id, { role });
          return nouveau;
        });
      } catch (erreur) {
        // Ajouts simultanés : l'unicité est garantie par la base (RG-01, RG-02).
        if (estViolationUnicite(erreur, 'utilisateur_email_unique'))
          throw conflit(undefined, { email: MESSAGES_EQUIPE.emailPris });
        if (!estViolationUnicite(erreur, 'utilisateur_pseudo_unique')) throw erreur;
      }
    }
    throw new Error('Impossible d’attribuer un pseudo libre au nouveau compte');
  }

  /** « Salim Ouedraogo » → salim-ouedraogo, puis salim-ouedraogo-2… ; à défaut, un pseudo tiré au
      hasard comme à l'inscription. */
  private pseudosPour(nom: string): string[] {
    const racine = slugifier(nom, LONGUEURS.pseudo.max - 3);
    const depuisLeNom =
      racine.length >= LONGUEURS.pseudo.min && !estPseudoReserve(racine)
        ? [racine, ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${racine}-${n}`)]
        : [];
    return [...depuisLeNom, ...Array.from({ length: 5 }, () => tirerPseudo())];
  }

  private async auditer(
    db: Executeur,
    acteur: Acteur | null,
    action: ActionAudit,
    cibleId: number,
    details: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(journalAudit).values({
      acteurId: acteur?.id ?? null,
      action,
      cibleType: 'utilisateur',
      cibleId,
      details: acteur ? details : { ...details, origine: 'serveur' },
      empreinteIp: acteur?.ip ? empreinteSalee(this.config.SEL_EMPREINTES, acteur.ip) : null,
    });
  }
}
