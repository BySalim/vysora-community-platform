import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIONS_AUDIT,
  type EntreeAuditApi,
  type FiltresAudit,
  type JournalAuditApi,
} from '@vysora/shared';
import { and, count, desc, eq, gte, inArray, lt, type SQL } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  badge,
  categorie,
  defi,
  demandeGuide,
  editeur,
  etiquette,
  guide,
  invitation,
  journalAudit,
  licence,
  modele,
  outil,
  propositionPiege,
  utilisateur,
} from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

const PAR_PAGE = 20;

type Noms = (db: BaseDeDonnees, ids: number[]) => Promise<{ id: number; nom: string }[]>;

/** Nom actuel d'un élément visé, par type de cible ; une version d'un document légal se nomme par
    les détails inscrits (elle peut avoir été retirée). */
const NOMS: Record<string, Noms> = {
  invitation: (db, ids) =>
    db
      .select({ id: invitation.id, nom: invitation.code })
      .from(invitation)
      .where(inArray(invitation.id, ids)),
  editeur: (db, ids) =>
    db.select({ id: editeur.id, nom: editeur.nom }).from(editeur).where(inArray(editeur.id, ids)),
  outil: (db, ids) =>
    db.select({ id: outil.id, nom: outil.nom }).from(outil).where(inArray(outil.id, ids)),
  modele: (db, ids) =>
    db.select({ id: modele.id, nom: modele.nom }).from(modele).where(inArray(modele.id, ids)),
  categorie: (db, ids) =>
    db
      .select({ id: categorie.id, nom: categorie.libelle })
      .from(categorie)
      .where(inArray(categorie.id, ids)),
  licence: (db, ids) =>
    db
      .select({ id: licence.id, nom: licence.libelle })
      .from(licence)
      .where(inArray(licence.id, ids)),
  etiquette: (db, ids) =>
    db
      .select({ id: etiquette.id, nom: etiquette.libelle })
      .from(etiquette)
      .where(inArray(etiquette.id, ids)),
  badge: (db, ids) =>
    db.select({ id: badge.id, nom: badge.libelle }).from(badge).where(inArray(badge.id, ids)),
  defi: (db, ids) =>
    db.select({ id: defi.id, nom: defi.titre }).from(defi).where(inArray(defi.id, ids)),
  guide: (db, ids) =>
    db.select({ id: guide.id, nom: guide.titreCourt }).from(guide).where(inArray(guide.id, ids)),
  demande_guide: (db, ids) =>
    db
      .select({ id: demandeGuide.id, nom: demandeGuide.libelle })
      .from(demandeGuide)
      .where(inArray(demandeGuide.id, ids)),
  proposition_piege: (db, ids) =>
    db
      .select({ id: propositionPiege.id, nom: propositionPiege.titre })
      .from(propositionPiege)
      .where(inArray(propositionPiege.id, ids)),
};

/* ENF-09 : consultation du journal d'audit par les administrateurs (ADM-02) : les actions
   d'administration (rôles, double authentification, invitations, référentiels, documents légaux,
   défis, guides d'Explorer), de la plus récente à la plus ancienne, filtrables par domaine, auteur et période.
   L'empreinte de l'adresse IP reste en base : elle ne sert qu'à une enquête. */
@Injectable()
export class JournalAuditService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async journal(filtres: FiltresAudit): Promise<JournalAuditApi> {
    const conditions: (SQL | undefined)[] = [];
    if (filtres.domaine)
      conditions.push(inArray(journalAudit.action, [...ACTIONS_AUDIT[filtres.domaine]]));
    if (filtres.acteur) {
      const [acteur] = await this.db
        .select({ id: utilisateur.id })
        .from(utilisateur)
        .where(eq(utilisateur.pseudo, filtres.acteur.toLowerCase().replace(/^@/, '')));
      conditions.push(eq(journalAudit.acteurId, acteur?.id ?? 0));
    }
    if (filtres.du) conditions.push(gte(journalAudit.date, new Date(`${filtres.du}T00:00:00Z`)));
    if (filtres.au) {
      const fin = new Date(`${filtres.au}T00:00:00Z`);
      fin.setUTCDate(fin.getUTCDate() + 1);
      conditions.push(lt(journalAudit.date, fin));
    }
    const ou = and(...conditions);
    const [[totaux], lignes] = await Promise.all([
      this.db.select({ n: count() }).from(journalAudit).where(ou),
      this.db
        .select()
        .from(journalAudit)
        .where(ou)
        .orderBy(desc(journalAudit.date), desc(journalAudit.id))
        .limit(PAR_PAGE)
        .offset((filtres.page - 1) * PAR_PAGE),
    ]);
    const total = totaux?.n ?? 0;
    return {
      elements: await this.presenter(lignes),
      total,
      page: filtres.page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
    };
  }

  private async presenter(lignes: (typeof journalAudit.$inferSelect)[]): Promise<EntreeAuditApi[]> {
    const idsDe = (type: string) =>
      lignes.flatMap((l) => (l.cibleType === type && l.cibleId !== null ? [l.cibleId] : []));
    const [membres, ...noms] = await Promise.all([
      resumerMembres(this.db, this.stockage, [
        ...lignes.flatMap((l) => (l.acteurId === null ? [] : [l.acteurId])),
        ...idsDe('utilisateur'),
      ]),
      ...Object.entries(NOMS).map(async ([type, lire]) => {
        const ids = idsDe(type);
        const trouves = ids.length ? await lire(this.db, ids) : [];
        return trouves.map((t): [string, string] => [`${type}:${t.id}`, t.nom]);
      }),
    ]);
    const nomDe = new Map(noms.flat());
    return lignes.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      action: l.action,
      acteur: l.acteurId === null ? null : (membres.get(l.acteurId) ?? null),
      cible: l.cibleType
        ? {
            type: l.cibleType,
            id: l.cibleId,
            nom: nomDe.get(`${l.cibleType}:${l.cibleId}`) ?? null,
            membre:
              l.cibleType === 'utilisateur' && l.cibleId !== null
                ? (membres.get(l.cibleId) ?? null)
                : null,
          }
        : null,
      details: l.details ?? null,
    }));
  }
}
