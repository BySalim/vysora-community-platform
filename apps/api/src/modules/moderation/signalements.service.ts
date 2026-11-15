import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  masquageAutomatiqueAtteint,
  type CodeNiveau,
  type ContenuModereApi,
  type Signalement,
  type SignalementEnregistreApi,
} from '@vysora/shared';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { conflit, estViolationUnicite, interdit, introuvable } from '../../commun/erreurs.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import {
  contenu,
  mouvementReputation,
  niveau,
  signalement,
  utilisateur,
} from '../../db/schema/index.js';
import { retirerDeLaRecherche } from '../creations/contenu-creation.js';
import { EmailService } from '../email/email.service.js';
import { lireCible } from '../interactions/cibles.js';
import { Stockage } from '../medias/stockage.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReputationService } from '../progression/reputation.service.js';
import { contenusLies, presenterContenus } from './contenus-moderes.js';
import { emailMasquageAutomatique, referenceMasquageAutomatique } from './courriels.js';

/* F-90 : un membre signale un contenu qu'il peut lire. RG-100 : motif de la liste, précision exigée
   pour « Autre », jamais sur son propre contenu, au plus un signalement ouvert par membre et par
   contenu (CI-21, index unique partiel). Le signalement attend la décision d'un modérateur (F-91).
   F-93, RG-101 : le signalement qui atteint le seuil (trois membres distincts de niveau Apprenti ou
   plus, signalements ouverts) masque le contenu à titre provisoire. Le contenu est verrouillé le
   temps du compte : deux signalements simultanés ne le masquent qu'une fois. Les points nés du
   contenu sont annulés à la date du masquage (RG-82) et l'auteur est prévenu, sur Vysora et par
   e-mail, de l'outil automatisé et de l'examen à venir, sans apprendre qui l'a signalé. Aucune
   décision n'est enregistrée : la modération examine le contenu, en tête de sa file. */
@Injectable()
export class SignalementsService {
  private readonly journal = new Logger(SignalementsService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
    private readonly emails: EmailService,
    private readonly stockage: Stockage,
  ) {}

  async signaler(
    membreId: number,
    contenuId: number,
    saisie: Signalement,
    maintenant = new Date(),
  ): Promise<SignalementEnregistreApi> {
    const cible = await lireCible(this.db, contenuId);
    // RG-30 : ce qu'une personne ne peut pas lire n'existe pas pour elle.
    if (!cible?.public) throw introuvable('Ce contenu est introuvable.');
    if (cible.auteurId === membreId)
      throw interdit('Vous ne pouvez pas signaler votre propre contenu.');
    // Intitulé lu avant un éventuel masquage : celui que l'auteur connaît.
    const presente = (await presenterContenus(this.db, this.stockage, [contenuId])).get(contenuId);
    try {
      const { cree, masque } = await this.db.transaction(async (tx) => {
        await tx
          .select({ id: contenu.id })
          .from(contenu)
          .where(eq(contenu.id, contenuId))
          .for('update');
        const [enregistre] = await tx
          .insert(signalement)
          .values({
            signaleurId: membreId,
            contenuId,
            motif: saisie.motif,
            precision: saisie.precision,
            date: maintenant,
          })
          .returning({ id: signalement.id, date: signalement.date });
        if (!enregistre) throw new Error('Signalement non enregistré');
        return {
          cree: enregistre,
          masque: await this.masquerAuSeuil(tx, contenuId, presente, maintenant),
        };
      });
      if (masque && presente)
        await this.informer(presente).catch((erreur: unknown) =>
          this.journal.warn(
            `E-mail du masquage automatique du contenu ${contenuId} non envoyé : ${String(erreur)}`,
          ),
        );
      return { id: cree.id, date: cree.date.toISOString() };
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'signalement_ouvert_unique'))
        throw conflit('Vous avez déjà signalé ce contenu. La modération l’examine.');
      throw erreur;
    }
  }

  /** RG-101 : masque le contenu, s'il est encore visible de tous, quand ses signalements ouverts
      atteignent le seuil. Renvoie vrai s'il vient d'être masqué. */
  private async masquerAuSeuil(
    tx: Transaction,
    contenuId: number,
    presente: ContenuModereApi | undefined,
    maintenant: Date,
  ): Promise<boolean> {
    // Relu sous verrou : une décision a pu le masquer entre-temps.
    const cible = await lireCible(tx, contenuId);
    if (!cible?.public) return false;
    const { signaleurs, niveaux } = await signaleursOuverts(tx, contenuId);
    if (!masquageAutomatiqueAtteint(signaleurs, niveaux)) return false;

    await tx
      .update(contenu)
      .set({ statut: 'MASQUE', dateMasquageAutomatique: maintenant })
      .where(eq(contenu.id, contenuId));
    // Même date que le masquage : le rétablissement retrouve ainsi ce qu'il a annulé.
    await this.reputation.annulerContenus(
      tx,
      await contenusLies(tx, contenuId, cible.type),
      maintenant,
    );
    await retirerDeLaRecherche(tx, contenuId);
    await this.notifications.notifier(tx, {
      type: 'CONTENU_MASQUE',
      destinataireId: cible.auteurId,
      contenuId,
      donnees: {
        action: 'MASQUER',
        automatique: true,
        typeContenu: cible.type,
        ...(presente ? { intitule: presente.intitule } : {}),
      },
      date: maintenant,
    });
    return true;
  }

  /** CGU, article 6 : e-mail à l'auteur, quelles que soient ses préférences (RG-90), à une adresse
      qu'il a vérifiée ; le masquage reste dans ses notifications. */
  private async informer(presente: ContenuModereApi): Promise<void> {
    const [auteur] = await this.db
      .select({ email: utilisateur.email, emailVerifie: utilisateur.emailVerifie })
      .from(utilisateur)
      .where(eq(utilisateur.id, presente.auteur.id));
    if (!auteur?.email || !auteur.emailVerifie) return;
    const site = (chemin: string) => new URL(chemin, this.config.SITE_URL).href;
    await this.emails.envoyer(
      emailMasquageAutomatique({
        a: auteur.email,
        id: presente.id,
        contenu: { type: presente.type, intitule: presente.intitule },
        modifier: presente.type === 'CREATION' ? site(`/creations/${presente.id}/modifier`) : null,
        observations: site(
          `/contact?motif=contestation&contenu=${encodeURIComponent(referenceMasquageAutomatique(presente.id))}`,
        ),
      }),
    );
  }
}

/** Membres distincts dont un signalement est ouvert sur ce contenu, avec leur rôle et leur
    réputation (RG-83), et les niveaux tels que l'administration les a enregistrés (RG-85). Les
    comptes fermés (bannis, supprimés) ne comptent plus. */
async function signaleursOuverts(tx: Transaction, contenuId: number) {
  const membres = await tx
    .selectDistinct({ id: utilisateur.id, role: utilisateur.role })
    .from(signalement)
    .innerJoin(utilisateur, eq(utilisateur.id, signalement.signaleurId))
    .where(
      and(
        eq(signalement.contenuId, contenuId),
        eq(signalement.statut, 'OUVERT'),
        notInArray(utilisateur.statutCompte, ['BANNI', 'SUPPRIME']),
      ),
    );
  if (!membres.length) return { signaleurs: [], niveaux: [] };
  const [reputations, niveaux] = await Promise.all([
    tx
      .select({
        id: mouvementReputation.beneficiaireId,
        points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int`,
      })
      .from(mouvementReputation)
      .where(
        inArray(
          mouvementReputation.beneficiaireId,
          membres.map((m) => m.id),
        ),
      )
      .groupBy(mouvementReputation.beneficiaireId),
    tx.select().from(niveau),
  ]);
  const points = new Map(reputations.map((r) => [r.id, r.points]));
  return {
    signaleurs: membres.map((m) => ({ role: m.role, reputation: points.get(m.id) ?? 0 })),
    niveaux: niveaux.map((n) => ({ ...n, code: n.code as CodeNiveau })),
  };
}
