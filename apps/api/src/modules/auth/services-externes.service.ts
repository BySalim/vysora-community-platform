import { Inject, Injectable } from '@nestjs/common';
import {
  NOMS_SERVICES,
  cheminInterne,
  fournisseurDe,
  motifArrivee,
  serviceDe,
  type CompteExterneApi,
  type IntentionService,
  type ResultatService,
  type ServiceExterne,
  type StatutCompte,
} from '@vysora/shared';
import { and, eq, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { compteExterne, utilisateur } from '../../db/schema/index.js';
import { ComptesService } from './comptes.service.js';
import { ConnexionService } from './connexion.service.js';
import type { ProfilExterne } from './fournisseurs-oauth.js';
import type { ContexteConnexion } from './requete.js';

/* Règles de la connexion avec GitHub et Google (F-02, S-10, WF-01 1a). Au retour du service :
   - un compte du service déjà lié ouvre la session du membre (mêmes règles que le mot de passe :
     compte banni refusé, suppression annulée, double authentification de l'équipe) ;
   - sinon, l'adresse fournie appartient-elle à un compte Vysora ? Rien n'est fusionné : la personne
     se connecte à son compte puis lie le service depuis ses paramètres ;
   - sinon, l'inscription crée le compte ; la connexion propose de le créer ;
   - depuis les paramètres, le service est lié au compte du membre connecté. */

/** Où envoyer le navigateur au retour, et la session à poser avec la redirection. */
export interface IssueAllerRetour {
  adresse: string;
  session?: { jeton: string; expiration: Date };
}

const PAGES: Record<IntentionService, string> = {
  connexion: '/connexion',
  inscription: '/inscription',
  liaison: '/parametres',
};

/** Page de l'intention, avec le service, l'issue et le contexte d'arrivée (« retour=…&pour=… »). */
export function adresseIssue(
  intention: IntentionService,
  service: ServiceExterne,
  issue: { resultat?: ResultatService; etape?: string; suppression?: Date | null },
  requete?: string,
): string {
  const parametres = new URLSearchParams({ service });
  if (issue.resultat) parametres.set('resultat', issue.resultat);
  if (issue.etape) parametres.set('etape', issue.etape);
  if (issue.suppression)
    parametres.set('suppression', issue.suppression.toISOString().slice(0, 10));
  for (const [cle, valeur] of new URLSearchParams(requete ?? '')) parametres.set(cle, valeur);
  return `${PAGES[intention]}?${parametres.toString()}`;
}

/** « retour=…&pour=… » d'une page de départ, réduit à ses deux paramètres et validé. */
export function requeteArrivee(retour: unknown, pour: unknown): string | undefined {
  const cible = typeof retour === 'string' ? cheminInterne(retour) : null;
  if (!cible) return undefined;
  const parametres = new URLSearchParams({ retour: cible });
  const motif = typeof pour === 'string' ? motifArrivee(pour) : '';
  if (motif) parametres.set('pour', motif);
  return parametres.toString();
}

const ROLES_EQUIPE = new Set(['MODERATEUR', 'ADMINISTRATEUR']);

@Injectable()
export class ServicesExternesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly comptes: ComptesService,
    private readonly connexion: ConnexionService,
  ) {}

  /** Connexion ou inscription au retour du service. */
  async connecterOuInscrire(entree: {
    service: ServiceExterne;
    intention: 'connexion' | 'inscription';
    profil: ProfilExterne;
    invitation?: string;
    requete?: string;
    contexte: ContexteConnexion;
    jetonActuel?: string;
  }): Promise<IssueAllerRetour> {
    const { service, intention, profil, requete } = entree;
    const fournisseur = fournisseurDe(service);
    const vers = (issue: Parameters<typeof adresseIssue>[2]) =>
      adresseIssue(intention, service, issue, requete);

    const [lie] = await this.db
      .select({
        lienId: compteExterne.id,
        id: utilisateur.id,
        role: utilisateur.role,
        statutCompte: utilisateur.statutCompte,
      })
      .from(compteExterne)
      .innerJoin(utilisateur, eq(utilisateur.id, compteExterne.utilisateurId))
      .where(
        and(
          eq(compteExterne.fournisseur, fournisseur),
          eq(compteExterne.identifiantFournisseur, profil.identifiant),
        ),
      )
      .limit(1);

    if (lie && lie.statutCompte !== 'SUPPRIME') {
      if (lie.statutCompte === 'BANNI') return { adresse: vers({ resultat: 'ferme' }) };
      // Le nom affiché dans les paramètres suit le compte du service (identifiant GitHub renommé).
      if (profil.nomCompte)
        await this.db
          .update(compteExterne)
          .set({ nomCompte: profil.nomCompte.slice(0, 255) })
          .where(eq(compteExterne.id, lie.lienId));
      const ouverte = await this.connexion.ouvrirPour(
        { id: lie.id, statutCompte: lie.statutCompte as StatutCompte },
        entree.contexte,
        entree.jetonActuel,
      );
      // La page Connexion termine comme après un mot de passe : « Bon retour », conditions à
      // accepter, suppression annulée ; pour l'équipe, la double authentification (ENF-05).
      return {
        adresse: adresseIssue(
          'connexion',
          service,
          {
            etape: ROLES_EQUIPE.has(lie.role) ? undefined : 'connecte',
            suppression: ouverte.suppressionAnnulee,
          },
          requete,
        ),
        session: { jeton: ouverte.jeton, expiration: ouverte.expiration },
      };
    }

    if (!profil.email) return { adresse: vers({ resultat: 'email-non-verifie' }) };
    if (await this.emailPris(profil.email)) return { adresse: vers({ resultat: 'email-pris' }) };
    if (intention === 'connexion') return { adresse: vers({ resultat: 'inconnu' }) };

    const cree = await this.comptes.inscrireAvecService(
      { fournisseur, identifiant: profil.identifiant, nomCompte: profil.nomCompte },
      profil.email,
      entree.invitation,
      entree.contexte,
      entree.jetonActuel,
    );
    if (cree === 'invitation' || cree === 'email-pris')
      return { adresse: vers({ resultat: cree }) };
    return {
      adresse: vers({ etape: 'pseudo' }),
      session: { jeton: cree.jeton, expiration: cree.expiration },
    };
  }

  /** Liaison depuis les paramètres (F-02) : un compte du service ne sert qu'à un compte Vysora, et
      un membre lie au plus un compte de chaque service. */
  async lier(
    utilisateurId: number,
    service: ServiceExterne,
    profil: ProfilExterne,
  ): Promise<ResultatService> {
    const fournisseur = fournisseurDe(service);
    const [existant] = await this.db
      .select({ utilisateurId: compteExterne.utilisateurId })
      .from(compteExterne)
      .where(
        and(
          eq(compteExterne.fournisseur, fournisseur),
          eq(compteExterne.identifiantFournisseur, profil.identifiant),
        ),
      );
    if (existant) return existant.utilisateurId === utilisateurId ? 'lie' : 'lie-ailleurs';
    try {
      await this.db.insert(compteExterne).values({
        utilisateurId,
        fournisseur,
        identifiantFournisseur: profil.identifiant,
        nomCompte: profil.nomCompte?.slice(0, 255) ?? null,
      });
      return 'lie';
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'compte_externe_utilisateur_unique')) return 'deja-lie';
      if (estViolationUnicite(erreur, 'compte_externe_fournisseur_unique')) return 'lie-ailleurs';
      throw erreur;
    }
  }

  /** Délier (F-02) : refusé si le service est le dernier moyen de se connecter au compte. */
  async delier(utilisateurId: number, service: ServiceExterne): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Verrou sur le compte : deux déliaisons simultanées ne laissent pas un compte sans accès.
      const [compte] = await tx
        .select({ empreinte: utilisateur.empreinteMotDePasse })
        .from(utilisateur)
        .where(eq(utilisateur.id, utilisateurId))
        .for('update');
      const lies = await tx
        .select({ fournisseur: compteExterne.fournisseur })
        .from(compteExterne)
        .where(eq(compteExterne.utilisateurId, utilisateurId));
      const fournisseur = fournisseurDe(service);
      if (!lies.some((lien) => lien.fournisseur === fournisseur))
        throw introuvable('Ce service n’est pas lié à votre compte.');
      if (!compte?.empreinte && lies.length === 1)
        throw conflit(
          `${NOMS_SERVICES[service]} est votre seul moyen de connexion. Définissez d’abord un mot de passe pour pouvoir le délier.`,
        );
      await tx
        .delete(compteExterne)
        .where(
          and(
            eq(compteExterne.utilisateurId, utilisateurId),
            eq(compteExterne.fournisseur, fournisseur),
          ),
        );
    });
  }

  /** Comptes liés, pour les paramètres. */
  async liste(utilisateurId: number): Promise<CompteExterneApi[]> {
    const lignes = await this.db
      .select({
        fournisseur: compteExterne.fournisseur,
        nom: compteExterne.nomCompte,
        dateLiaison: compteExterne.dateLiaison,
      })
      .from(compteExterne)
      .where(eq(compteExterne.utilisateurId, utilisateurId))
      .orderBy(compteExterne.fournisseur);
    return lignes.map((ligne) => ({
      service: serviceDe(ligne.fournisseur),
      nom: ligne.nom,
      dateLiaison: ligne.dateLiaison.toISOString(),
    }));
  }

  private async emailPris(email: string): Promise<boolean> {
    const n = await this.db.$count(utilisateur, sql`lower(${utilisateur.email}) = lower(${email})`);
    return n > 0;
  }
}
