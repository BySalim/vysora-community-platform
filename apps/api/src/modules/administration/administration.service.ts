import { Inject, Injectable } from '@nestjs/common';
import type {
  ActionAudit,
  ChangementRole,
  CreationInvitations,
  FiltresDecisions,
  InvitationAdministreeApi,
  JournalDecisionsApi,
  ListeInvitationsApi,
  ListeMembresAdministresApi,
  MembreAdministreApi,
} from '@vysora/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { conflit, introuvable } from '../../commun/erreurs.js';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  contenu,
  decisionModeration,
  doubleAuthentification,
  invitation,
  journalAudit,
  session,
  utilisateur,
} from '../../db/schema/index.js';
import { InvitationsService } from '../auth/invitations.service.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { DossiersService } from '../moderation/dossiers.service.js';

const PAR_PAGE = 20;
const INVITATIONS_PAR_PAGE = 50;

/** Qui agit, pour le journal d'audit (ENF-09) : membre et adresse IP (empreinte salée). */
export interface Acteur {
  id: number;
  ip?: string;
}

/** Échappe % et _ d'une recherche LIKE. */
const motif = (texte: string) => `%${texte.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/* Administration (ADM-01, EC-21, EC-23, F-92, F-96) : rôles de l'équipe et double authentification,
   codes d'invitation de la bêta, journal des décisions de modération. Chaque changement est inscrit
   au journal d'audit (ENF-09). */
@Injectable()
export class AdministrationService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly stockage: Stockage,
    private readonly invitations: InvitationsService,
    private readonly dossiers: DossiersService,
  ) {}

  /** L'équipe (modération et administration), ou les membres dont le pseudo, le nom ou l'adresse
      correspond à la recherche ; vingt au plus. */
  async membres(recherche?: string): Promise<ListeMembresAdministresApi> {
    const q = recherche?.trim().slice(0, 80);
    const filtre = q
      ? or(
          ilike(utilisateur.pseudo, motif(q)),
          ilike(utilisateur.nomAffiche, motif(q)),
          sql`lower(${utilisateur.email}) = lower(${q})`,
        )
      : ne(utilisateur.role, 'MEMBRE');
    const [lignes, [admins]] = await Promise.all([
      this.db
        .select({ id: utilisateur.id })
        .from(utilisateur)
        .where(and(filtre, ne(utilisateur.statutCompte, 'SUPPRIME')))
        .orderBy(
          sql`case ${utilisateur.role} when 'ADMINISTRATEUR' then 0 when 'MODERATEUR' then 1 else 2 end`,
          asc(utilisateur.pseudo),
        )
        .limit(PAR_PAGE),
      this.db
        .select({ n: count() })
        .from(utilisateur)
        .where(and(eq(utilisateur.role, 'ADMINISTRATEUR'), eq(utilisateur.statutCompte, 'ACTIF'))),
    ]);
    return {
      elements: await this.presenter(lignes.map((l) => l.id)),
      administrateursActifs: admins?.n ?? 0,
    };
  }

  /** F-96, RG-111 : attribuer ou retirer un rôle ; jamais moins d'un administrateur actif. */
  async changerRole(
    acteur: Acteur,
    membreId: number,
    { role }: ChangementRole,
  ): Promise<MembreAdministreApi> {
    await this.db.transaction(async (tx) => {
      // Les administrateurs sont verrouillés ensemble : deux retraits simultanés ne laissent pas la
      // plateforme sans administrateur.
      const equipe = await tx
        .select({ id: utilisateur.id, role: utilisateur.role, statut: utilisateur.statutCompte })
        .from(utilisateur)
        .where(or(eq(utilisateur.id, membreId), eq(utilisateur.role, 'ADMINISTRATEUR')))
        .for('update');
      const membre = equipe.find((m) => m.id === membreId);
      if (!membre || membre.statut === 'SUPPRIME') throw introuvable('Ce membre est introuvable.');
      if (membre.role === role) return;
      if (role !== 'MEMBRE' && membre.statut === 'BANNI')
        throw conflit('Un compte banni ne reçoit pas de rôle.');
      const autresAdmins = equipe.filter(
        (m) => m.id !== membreId && m.role === 'ADMINISTRATEUR' && m.statut === 'ACTIF',
      );
      if (membre.role === 'ADMINISTRATEUR' && autresAdmins.length === 0)
        throw conflit(
          'La plateforme compte toujours au moins un administrateur actif : nommez-en un autre avant de retirer ce rôle.',
        );
      await tx.update(utilisateur).set({ role }).where(eq(utilisateur.id, membreId));
      await this.auditer(tx, acteur, 'ROLE_MODIFIE', membreId, { avant: membre.role, apres: role });
    });
    return this.membre(membreId);
  }

  /** SEC-02 : appareil perdu. La clé et les codes de secours sont effacés, les sessions du membre
      redemandent la vérification ; il configure une nouvelle clé à sa prochaine connexion. */
  async reinitialiserDeuxFacteurs(acteur: Acteur, membreId: number): Promise<MembreAdministreApi> {
    await this.db.transaction(async (tx) => {
      const effacee = await tx
        .delete(doubleAuthentification)
        .where(eq(doubleAuthentification.utilisateurId, membreId))
        .returning({ id: doubleAuthentification.utilisateurId });
      if (!effacee.length)
        throw introuvable('Ce compte n’a pas de vérification en deux étapes à réinitialiser.');
      await tx
        .update(session)
        .set({ deuxFacteursValide: false })
        .where(eq(session.utilisateurId, membreId));
      await this.auditer(tx, acteur, 'DEUX_FACTEURS_REINITIALISEE', membreId);
    });
    return this.membre(membreId);
  }

  /** Codes d'invitation, les plus récents d'abord (INV-01). */
  async listeInvitations(page = 1): Promise<ListeInvitationsApi> {
    const maintenant = new Date();
    const libre = and(
      isNull(invitation.utilisateurId),
      or(isNull(invitation.dateExpiration), gt(invitation.dateExpiration, maintenant)),
    );
    const [[totaux], lignes] = await Promise.all([
      this.db
        .select({
          total: count(),
          libres: sql<number>`count(*) filter (where ${libre})::int`,
        })
        .from(invitation),
      this.db
        .select()
        .from(invitation)
        .orderBy(desc(invitation.dateCreation), desc(invitation.id))
        .limit(INVITATIONS_PAR_PAGE)
        .offset((page - 1) * INVITATIONS_PAR_PAGE),
    ]);
    const membres = await resumerMembres(
      this.db,
      this.stockage,
      lignes.flatMap((l) => [l.createurId, l.utilisateurId].filter((id) => id !== null)),
    );
    const total = totaux?.total ?? 0;
    return {
      elements: lignes.map((l): InvitationAdministreeApi => ({
        code: l.code,
        dateCreation: l.dateCreation.toISOString(),
        dateExpiration: l.dateExpiration?.toISOString() ?? null,
        createur: l.createurId === null ? null : (membres.get(l.createurId) ?? null),
        utilisation: l.dateUtilisation
          ? {
              date: l.dateUtilisation.toISOString(),
              membre: l.utilisateurId === null ? null : (membres.get(l.utilisateurId) ?? null),
            }
          : null,
        libre: !l.utilisateurId && (!l.dateExpiration || l.dateExpiration > maintenant),
      })),
      total,
      libres: totaux?.libres ?? 0,
      page,
      pages: Math.max(1, Math.ceil(total / INVITATIONS_PAR_PAGE)),
    };
  }

  async creerInvitations(
    acteur: Acteur,
    { nombre, joursValidite }: CreationInvitations,
  ): Promise<{ codes: string[] }> {
    const expiration = joursValidite
      ? new Date(Date.now() + joursValidite * 24 * 60 * 60_000)
      : null;
    const codes = await this.invitations.creer(nombre, acteur.id, expiration);
    await this.auditer(this.db, acteur, 'INVITATIONS_CREEES', null, { nombre, joursValidite });
    return { codes };
  }

  /** F-92 : journal des décisions, filtrable par modérateur, membre, action et période. */
  async journal(filtres: FiltresDecisions): Promise<JournalDecisionsApi> {
    const conditions: (SQL | undefined)[] = [];
    const idDe = async (pseudo: string) =>
      (
        await this.db
          .select({ id: utilisateur.id })
          .from(utilisateur)
          .where(eq(utilisateur.pseudo, pseudo.toLowerCase().replace(/^@/, '')))
      )[0]?.id ?? 0;
    if (filtres.moderateur)
      conditions.push(eq(decisionModeration.decideurId, await idDe(filtres.moderateur)));
    if (filtres.membre) {
      const id = await idDe(filtres.membre);
      conditions.push(or(eq(decisionModeration.membreViseId, id), eq(contenu.auteurId, id)));
    }
    if (filtres.action) conditions.push(eq(decisionModeration.action, filtres.action));
    if (filtres.du)
      conditions.push(gte(decisionModeration.date, new Date(`${filtres.du}T00:00:00Z`)));
    if (filtres.au) {
      const fin = new Date(`${filtres.au}T00:00:00Z`);
      fin.setUTCDate(fin.getUTCDate() + 1);
      conditions.push(lt(decisionModeration.date, fin));
    }
    const ou = and(...conditions);
    const [[totaux], lignes] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(decisionModeration)
        .leftJoin(contenu, eq(contenu.id, decisionModeration.contenuId))
        .where(ou),
      this.db
        .select({ decision: decisionModeration })
        .from(decisionModeration)
        .leftJoin(contenu, eq(contenu.id, decisionModeration.contenuId))
        .where(ou)
        .orderBy(desc(decisionModeration.date), desc(decisionModeration.id))
        .limit(PAR_PAGE)
        .offset((filtres.page - 1) * PAR_PAGE),
    ]);
    const total = totaux?.n ?? 0;
    return {
      elements: await this.dossiers.presenter(lignes.map((l) => l.decision)),
      total,
      page: filtres.page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
    };
  }

  /** Un membre tel que l'administration le présente (EC-23). */
  async membre(membreId: number): Promise<MembreAdministreApi> {
    const [membre] = await this.presenter([membreId]);
    if (!membre) throw introuvable('Ce membre est introuvable.');
    return membre;
  }

  /** Membres présentés dans l'ordre reçu. */
  private async presenter(ids: number[]): Promise<MembreAdministreApi[]> {
    if (!ids.length) return [];
    const [lignes, resumes] = await Promise.all([
      this.db
        .select({
          id: utilisateur.id,
          role: utilisateur.role,
          statutCompte: utilisateur.statutCompte,
          dateInscription: utilisateur.dateInscription,
          activation: doubleAuthentification.dateActivation,
          configuree: doubleAuthentification.utilisateurId,
        })
        .from(utilisateur)
        .leftJoin(doubleAuthentification, eq(doubleAuthentification.utilisateurId, utilisateur.id))
        .where(inArray(utilisateur.id, ids)),
      resumerMembres(this.db, this.stockage, ids),
    ]);
    const parId = new Map(lignes.map((l) => [l.id, l]));
    return ids.flatMap((id) => {
      const l = parId.get(id);
      const membre = resumes.get(id);
      if (!l || !membre) return [];
      return [
        {
          membre,
          role: l.role,
          statutCompte: l.statutCompte,
          dateInscription: l.dateInscription.toISOString(),
          deuxFacteurs: l.activation ? 'active' : l.configuree ? 'en-attente' : 'absente',
        },
      ];
    });
  }

  private async auditer(
    db: Executeur,
    acteur: Acteur,
    action: ActionAudit,
    cibleId: number | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(journalAudit).values({
      acteurId: acteur.id,
      action,
      cibleType: cibleId === null ? null : 'utilisateur',
      cibleId,
      details: details ?? null,
      empreinteIp: acteur.ip ? empreinteSalee(this.config.SEL_EMPREINTES, acteur.ip) : null,
    });
  }
}
