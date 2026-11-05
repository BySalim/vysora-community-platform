import { Inject, Injectable } from '@nestjs/common';
import type { Connexion, StatutCompte } from '@vysora/shared';
import { and, eq, sql } from 'drizzle-orm';
import { ErreurApplication, interdit } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { demandeDroit, utilisateur } from '../../db/schema/index.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import type { ContexteConnexion } from './requete.js';
import { SessionsService } from './sessions.service.js';
import { TemporisationService } from './temporisation.service.js';

export const MESSAGE_COMPTE_FERME =
  'Ce compte a été fermé par la modération. Pour contester cette décision, écrivez-nous depuis la page Contact.';

const tropDeTentatives = (secondes: number) =>
  new ErreurApplication(
    'TROP_DE_REQUETES',
    'La connexion est suspendue quelques instants pour protéger votre compte.',
    undefined,
    { reessayerDans: secondes },
  );

/* Connexion par e-mail et mot de passe (F-03, WF-02). Un seul message d'erreur, que l'adresse
   possède un compte ou non ; temporisation après 5 échecs consécutifs ; un compte banni ne se
   connecte pas ; un compte suspendu se connecte en lecture seule (RG-103) ; la connexion d'un
   compte en suppression annule la demande (WF-23). */
@Injectable()
export class ConnexionService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly temporisation: TemporisationService,
  ) {}

  async connecter(
    saisie: Connexion,
    contexte: ContexteConnexion,
    /** Session déjà présente sur l'appareil : fermée, jamais reprise (fixation de session). */
    jetonActuel?: string,
  ): Promise<{ jeton: string; expiration: Date; suppressionAnnulee: Date | null }> {
    const identifiant = this.temporisation.empreinte(saisie.email);
    const attente = await this.temporisation.attente(identifiant);
    if (attente > 0) throw tropDeTentatives(attente);

    const [compte] = await this.db
      .select({
        id: utilisateur.id,
        empreinteMotDePasse: utilisateur.empreinteMotDePasse,
        statutCompte: utilisateur.statutCompte,
      })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.email}) = lower(${saisie.email})`)
      .limit(1);

    const valide = await this.motsDePasse.verifier(compte?.empreinteMotDePasse, saisie.motDePasse);
    if (!compte || !valide) {
      await this.temporisation.enregistrer({
        empreinteIdentifiant: identifiant,
        utilisateurId: compte?.id ?? null,
        ip: contexte.ip,
        reussie: false,
      });
      const nouvelleAttente = await this.temporisation.attente(identifiant);
      if (nouvelleAttente > 0) throw tropDeTentatives(nouvelleAttente);
      throw new ErreurApplication('IDENTIFIANTS_INCORRECTS');
    }

    // Vérifié après le mot de passe : sans lui, rien ne distingue un compte banni.
    const resultat = await this.ouvrirPour(compte, contexte, jetonActuel);
    await this.temporisation.enregistrer({
      empreinteIdentifiant: identifiant,
      utilisateurId: compte.id,
      ip: contexte.ip,
      reussie: true,
    });
    return resultat;
  }

  /** Session ouverte pour un compte dont l'identité est établie (mot de passe, ou GitHub et Google,
      S-10) : un compte banni est refusé ; la reconnexion d'un compte en suppression l'annule. */
  async ouvrirPour(
    compte: { id: number; statutCompte: StatutCompte },
    contexte: ContexteConnexion,
    jetonActuel?: string,
  ): Promise<{ jeton: string; expiration: Date; suppressionAnnulee: Date | null }> {
    if (compte.statutCompte === 'BANNI') throw interdit(MESSAGE_COMPTE_FERME);
    if (compte.statutCompte === 'SUPPRIME') throw new ErreurApplication('IDENTIFIANTS_INCORRECTS');
    return this.db.transaction(async (tx) => {
      const suppressionAnnulee =
        compte.statutCompte === 'EN_SUPPRESSION'
          ? await this.annulerSuppression(compte.id, tx)
          : null;
      await tx
        .update(utilisateur)
        .set({ dateDerniereConnexion: new Date() })
        .where(eq(utilisateur.id, compte.id));
      if (jetonActuel) await this.sessions.fermer(jetonActuel, tx);
      const session = await this.sessions.ouvrir(compte.id, contexte, tx);
      return { ...session, suppressionAnnulee };
    });
  }

  /** WF-23 : la reconnexion pendant le délai de 30 jours annule la suppression ; renvoie la date de la demande. */
  private async annulerSuppression(utilisateurId: number, tx: Executeur): Promise<Date> {
    await tx
      .update(utilisateur)
      .set({ statutCompte: 'ACTIF' })
      .where(eq(utilisateur.id, utilisateurId));
    const [demande] = await tx
      .update(demandeDroit)
      .set({ statut: 'ANNULEE', dateTraitement: new Date() })
      .where(
        and(
          eq(demandeDroit.utilisateurId, utilisateurId),
          eq(demandeDroit.type, 'SUPPRESSION'),
          eq(demandeDroit.statut, 'EN_COURS'),
        ),
      )
      .returning({ dateDemande: demandeDroit.dateDemande });
    return demande?.dateDemande ?? new Date();
  }
}
