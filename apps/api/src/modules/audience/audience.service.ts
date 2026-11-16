import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIENCE,
  EVENEMENTS_PARCOURS,
  PAGE_AUTRE,
  PROVENANCE_SITE,
  audienceRefusee,
  cheminMesure,
  decrireAppareil,
  estRobot,
  lireCookie,
  messageErreurNavigateur,
  nomCookieParcours,
  parcoursAccepte,
  provenance,
  type Appareil,
  type DescriptionAppareil,
  type EtapeVisiteApi,
  type EvenementParcours,
  type LigneMesureAudience,
  type MesureAudience,
  type MesureAudienceApi,
  type NatureEtape,
  type Navigateur,
  type SaisieEvenementNavigateur,
  type SaisiePageServie,
  type Systeme,
} from '@vysora/shared';
import type { Request } from 'express';
import { and, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  audienceCompteur,
  audienceVisiteur,
  parcoursEtape,
  parcoursVisite,
} from '../../db/schema/index.js';

const JOUR_MS = 86_400_000;
const jourUtc = (date: Date): string => date.toISOString().slice(0, 10);
/** Zones dont les pages, même introuvables, ne se mesurent pas : l'API, les fichiers, l'équipe. */
const HORS_MESURE = /^\/(?:api|_astro|_image|admin|moderation)(?:\/|$)/i;
const identifiantVisite = z.uuid();

interface Etape {
  nature: NatureEtape;
  valeur: string;
  detail?: string;
}

/** Ce que l'on sait de la visite quand elle commence à être suivie. */
interface DebutVisite {
  arrivee: string;
  appareil: DescriptionAppareil;
}

/* LEG-03 : mesure d'audience de l'équipe.
   - Mesure anonyme (sans cookie, exemptée de consentement, sauf refus) : compteurs par jour des pages
     vues, des visiteurs différents (empreinte salée du jour, effacée le surlendemain), des arrivées par
     provenance, des catégories d'appareil et des problèmes techniques (404, 500, erreurs de l'API et
     des scripts).
   - Parcours (accord de la personne, cookie de visite) : les étapes d'une visite, jamais reliées au
     compte ni à l'adresse IP.
   Le choix de la personne est lu dans ses cookies : le signalement du site ne fait pas foi. */
@Injectable()
export class AudienceService {
  private readonly hoteSite: string;
  private readonly cookieParcours: string;

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {
    this.hoteSite = new URL(config.SITE_URL).hostname;
    this.cookieParcours = nomCookieParcours(config.NODE_ENV === 'production');
  }

  /** Page servie par le site, avec les cookies et l'adresse IP de la personne. */
  async enregistrerPage(
    saisie: SaisiePageServie,
    personne: { enteteCookie?: string; ip?: string },
    maintenant = new Date(),
  ): Promise<void> {
    if (estRobot(saisie.userAgent)) return;
    if (!saisie.adresse.startsWith('/') || saisie.adresse.startsWith('//')) return;
    const refus = audienceRefusee(personne.enteteCookie);
    const visite =
      saisie.parcours && parcoursAccepte(personne.enteteCookie) ? saisie.parcours : null;
    if (refus && !visite) return;

    const url = new URL(saisie.adresse, 'http://vysora.invalid');
    if (HORS_MESURE.test(url.pathname)) return;
    const chemin = cheminMesure(saisie.adresse);
    if (!chemin && saisie.statut === 200) return;
    const page = chemin ?? PAGE_AUTRE;
    const arrivee = provenance(saisie.referent, url.searchParams.get('utm_source'), this.hoteSite);
    const appareil = decrireAppareil(saisie.userAgent);
    const jour = jourUtc(maintenant);

    if (!refus)
      await this.db.transaction(async (tx) => {
        const mesure: MesureAudience =
          saisie.statut === 200 ? 'PAGE' : saisie.statut === 404 ? 'INTROUVABLE' : 'ERREUR_PAGE';
        await incrementer(tx, jour, mesure, page);
        // Arrivées et visiteurs : seulement sur une page réussie (un robot qui sonde le site avec un
        // nom de navigateur ordinaire ne trouve que des pages introuvables).
        if (saisie.statut !== 200) return;
        if (arrivee) await incrementer(tx, jour, 'PROVENANCE', arrivee);
        if (!personne.ip) return;
        const empreinte = empreinteSalee(
          this.config.SEL_EMPREINTES,
          `audience:${jour}:${personne.ip}:${saisie.userAgent ?? ''}`,
        );
        const [nouveau] = await tx
          .insert(audienceVisiteur)
          .values({ jour, empreinte })
          .onConflictDoNothing()
          .returning({ jour: audienceVisiteur.jour });
        if (!nouveau) return;
        await incrementer(tx, jour, 'VISITEURS', '');
        await incrementer(tx, jour, 'APPAREIL', appareil.appareil);
        await incrementer(tx, jour, 'NAVIGATEUR', appareil.navigateur);
        await incrementer(tx, jour, 'SYSTEME', appareil.systeme);
      });

    if (visite)
      await this.ajouterEtape(
        visite,
        saisie.statut === 200
          ? { nature: 'PAGE', valeur: page }
          : { nature: 'ERREUR', valeur: page, detail: String(saisie.statut) },
        { arrivee: arrivee ?? PROVENANCE_SITE, appareil },
        maintenant,
      );
  }

  /** Erreur d'un script du site ou recherche, relevée par le navigateur. */
  async enregistrerEvenementNavigateur(
    saisie: SaisieEvenementNavigateur,
    requete: Request,
    maintenant = new Date(),
  ): Promise<void> {
    const userAgent = requete.headers['user-agent'];
    if (estRobot(userAgent)) return;
    const page = cheminMesure(saisie.page) ?? PAGE_AUTRE;
    const debut = { arrivee: PROVENANCE_SITE, appareil: decrireAppareil(userAgent) };
    if (saisie.type === 'RECHERCHE') {
      await this.etapeDeLaRequete(requete, { nature: 'EVENEMENT', valeur: 'RECHERCHE' }, debut);
      return;
    }
    const message = messageErreurNavigateur(saisie.message);
    if (!message) return;
    if (!audienceRefusee(requete.headers.cookie))
      await incrementer(this.db, jourUtc(maintenant), 'ERREUR_NAVIGATEUR', page, message);
    await this.etapeDeLaRequete(
      requete,
      { nature: 'ERREUR', valeur: page, detail: message },
      debut,
    );
  }

  /** Action réussie dans l'API (EvenementParcours), inscrite dans la visite suivie s'il y en a une. */
  async enregistrerEvenement(requete: Request, evenement: EvenementParcours): Promise<void> {
    if (estRobot(requete.headers['user-agent'])) return;
    await this.etapeDeLaRequete(
      requete,
      { nature: 'EVENEMENT', valeur: evenement },
      { arrivee: PROVENANCE_SITE, appareil: decrireAppareil(requete.headers['user-agent']) },
    );
  }

  /** Erreur rendue par l'API : une erreur interne est comptée par route (mesure anonyme) ; dans une
      visite suivie, toute erreur d'une action (et une erreur interne d'une lecture) est une étape. */
  async enregistrerErreurApi(requete: Request, statut: number, code: string): Promise<void> {
    if (estRobot(requete.headers['user-agent'])) return;
    const route = routeDe(requete);
    if (statut >= 500 && !audienceRefusee(requete.headers.cookie))
      await incrementer(this.db, jourUtc(new Date()), 'ERREUR_API', route);
    const lecture = requete.method === 'GET' || requete.method === 'HEAD';
    if (lecture && statut < 500) return;
    await this.etapeDeLaRequete(
      requete,
      { nature: 'ERREUR', valeur: route, detail: code },
      { arrivee: PROVENANCE_SITE, appareil: decrireAppareil(requete.headers['user-agent']) },
    );
  }

  /** Étape de la visite désignée par le cookie de visite de la requête, si la personne l'a accepté. */
  private async etapeDeLaRequete(requete: Request, etape: Etape, debut: DebutVisite) {
    const entete = requete.headers.cookie;
    if (!parcoursAccepte(entete)) return;
    const visite = identifiantVisite.safeParse(lireCookie(entete, this.cookieParcours));
    if (!visite.success) return;
    await this.ajouterEtape(visite.data, etape, debut);
  }

  private async ajouterEtape(
    visiteId: string,
    etape: Etape,
    debut: DebutVisite,
    maintenant = new Date(),
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(parcoursVisite)
        .values({
          id: visiteId,
          debut: maintenant,
          derniere: maintenant,
          provenance: debut.arrivee,
          ...debut.appareil,
        })
        .onConflictDoNothing();
      const [visite] = await tx
        .update(parcoursVisite)
        .set({
          derniere: maintenant,
          nbEtapes: sql`${parcoursVisite.nbEtapes} + 1`,
          ...(etape.nature === 'PAGE' ? { nbPages: sql`${parcoursVisite.nbPages} + 1` } : {}),
          ...(etape.nature === 'ERREUR' ? { nbErreurs: sql`${parcoursVisite.nbErreurs} + 1` } : {}),
        })
        .where(
          and(
            eq(parcoursVisite.id, visiteId),
            lt(parcoursVisite.nbEtapes, AUDIENCE.etapesParVisiteMax),
          ),
        )
        .returning({ rang: parcoursVisite.nbEtapes });
      if (!visite) return;
      await tx.insert(parcoursEtape).values({
        visiteId,
        rang: visite.rang,
        date: maintenant,
        nature: etape.nature,
        valeur: etape.valeur.slice(0, 160),
        detail: (etape.detail ?? '').slice(0, 160),
      });
    });
  }

  /* Tableau de l'administration ------------------------------------------------------------------ */

  /** Les `jours` derniers jours, aujourd'hui compris (UTC). */
  async mesure(jours: number, maintenant = new Date()): Promise<MesureAudienceApi> {
    const au = jourUtc(maintenant);
    const du = jourUtc(new Date(maintenant.getTime() - (jours - 1) * JOUR_MS));
    const [compteurs, parcours] = await Promise.all([
      this.compteurs(du, au),
      this.parcours(du, au),
    ]);
    return { jours, du, au, ...compteurs, parcours };
  }

  private async compteurs(du: string, au: string) {
    const lignes = await this.db
      .select({
        jour: audienceCompteur.jour,
        mesure: audienceCompteur.mesure,
        valeur: audienceCompteur.valeur,
        detail: audienceCompteur.detail,
        nombre: audienceCompteur.nombre,
      })
      .from(audienceCompteur)
      .where(sql`${audienceCompteur.jour} between ${du} and ${au}`);

    const totaux = new Map<string, Map<string, number>>();
    const parJour = new Map<string, { visiteurs: number; pagesVues: number }>();
    for (const ligne of lignes) {
      const cle =
        ligne.mesure === 'ERREUR_NAVIGATEUR' ? `${ligne.valeur}\n${ligne.detail}` : ligne.valeur;
      const groupe = totaux.get(ligne.mesure) ?? new Map<string, number>();
      groupe.set(cle, (groupe.get(cle) ?? 0) + ligne.nombre);
      totaux.set(ligne.mesure, groupe);
      if (ligne.mesure === 'PAGE' || ligne.mesure === 'VISITEURS') {
        const point = parJour.get(ligne.jour) ?? { visiteurs: 0, pagesVues: 0 };
        if (ligne.mesure === 'PAGE') point.pagesVues += ligne.nombre;
        else point.visiteurs += ligne.nombre;
        parJour.set(ligne.jour, point);
      }
    }
    const classer = (mesure: MesureAudience, limite = Infinity): LigneMesureAudience[] =>
      [...(totaux.get(mesure) ?? [])]
        .map(([valeur, nombre]) => ({ valeur, nombre }))
        .toSorted((a, b) => b.nombre - a.nombre || a.valeur.localeCompare(b.valeur))
        .slice(0, limite);
    const somme = (mesure: MesureAudience) =>
      [...(totaux.get(mesure)?.values() ?? [])].reduce((s, n) => s + n, 0);

    const points: MesureAudienceApi['parJour'] = [];
    for (let t = Date.parse(du); t <= Date.parse(au); t += JOUR_MS) {
      const jour = jourUtc(new Date(t));
      points.push({ jour, ...(parJour.get(jour) ?? { visiteurs: 0, pagesVues: 0 }) });
    }
    const n = AUDIENCE.problemesAffiches;
    return {
      chiffres: {
        visiteurs: somme('VISITEURS'),
        visites: somme('PROVENANCE'),
        pagesVues: somme('PAGE'),
        problemes:
          somme('INTROUVABLE') +
          somme('ERREUR_PAGE') +
          somme('ERREUR_API') +
          somme('ERREUR_NAVIGATEUR'),
      },
      parJour: points,
      pages: classer('PAGE', AUDIENCE.pagesAffichees),
      provenances: classer('PROVENANCE', AUDIENCE.provenancesAffichees),
      appareils: classer('APPAREIL').map((l) => ({ code: l.valeur as Appareil, nombre: l.nombre })),
      navigateurs: classer('NAVIGATEUR').map((l) => ({
        code: l.valeur as Navigateur,
        nombre: l.nombre,
      })),
      systemes: classer('SYSTEME').map((l) => ({ code: l.valeur as Systeme, nombre: l.nombre })),
      problemes: {
        introuvables: classer('INTROUVABLE', n),
        erreursPages: classer('ERREUR_PAGE', n),
        erreursApi: classer('ERREUR_API', n),
        erreursNavigateur: classer('ERREUR_NAVIGATEUR', n).map(({ valeur, nombre }) => {
          const [page = '', message = ''] = valeur.split('\n');
          return { page, message, nombre };
        }),
      },
    };
  }

  private async parcours(du: string, au: string): Promise<MesureAudienceApi['parcours']> {
    // Visites commencées pendant la période (jours UTC).
    const periode = sql`v.debut >= ${debutJour(du)} and v.debut < ${debutJour(au, 1)}`;
    const [resume] = (
      await this.db.execute<{ visites: number; pages: number; duree: number }>(sql`
        select count(*)::int as visites,
               coalesce(round(avg(v.nb_pages)::numeric, 1), 0)::float as pages,
               coalesce(percentile_cont(0.5) within group
                 (order by extract(epoch from v.derniere - v.debut)), 0)::int as duree
        from parcours_visite v where ${periode}`)
    ).rows;

    const pagesDesVisites = sql`
      select e.visite_id, e.rang, e.valeur from parcours_etape e
      join parcours_visite v on v.id = e.visite_id
      where e.nature = 'PAGE' and ${periode}`;
    const lignes = <T extends Record<string, unknown>>(requete: ReturnType<typeof sql>) =>
      this.db.execute<T>(requete).then((r) => r.rows);
    const [entrees, sorties, enchainements, evenements, inscription] = await Promise.all([
      lignes<{ valeur: string; nombre: number }>(sql`
        select valeur, count(*)::int as nombre from (
          select distinct on (visite_id) valeur from (${pagesDesVisites}) p order by visite_id, rang
        ) premieres group by valeur order by nombre desc, valeur limit ${AUDIENCE.pagesAffichees}`),
      lignes<{ valeur: string; nombre: number }>(sql`
        select valeur, count(*)::int as nombre from (
          select distinct on (visite_id) valeur from (${pagesDesVisites}) p order by visite_id, rang desc
        ) dernieres group by valeur order by nombre desc, valeur limit ${AUDIENCE.pagesAffichees}`),
      lignes<{ de: string; vers: string; nombre: number }>(sql`
        select de, vers, count(*)::int as nombre from (
          select valeur as de, lead(valeur) over (partition by visite_id order by rang) as vers
          from (${pagesDesVisites}) p
        ) suites where vers is not null and vers <> de
        group by de, vers order by nombre desc, de, vers limit ${AUDIENCE.enchainementsAffiches}`),
      lignes<{ code: string; visites: number }>(sql`
        select e.valeur as code, count(distinct e.visite_id)::int as visites
        from parcours_etape e join parcours_visite v on v.id = e.visite_id
        where e.nature = 'EVENEMENT' and ${periode} group by e.valeur`),
      lignes<{ pages: number; inscrites: number }>(sql`
        select
          count(distinct e.visite_id) filter (where e.nature = 'PAGE' and e.valeur = '/inscription')::int as pages,
          count(distinct e.visite_id) filter (where e.nature = 'EVENEMENT' and e.valeur = 'INSCRIPTION')::int as inscrites
        from parcours_etape e join parcours_visite v on v.id = e.visite_id where ${periode}`),
    ]);

    const visitesErreur = await this.db
      .select()
      .from(parcoursVisite)
      .where(
        sql`${parcoursVisite.nbErreurs} > 0 and ${parcoursVisite.debut} >= ${debutJour(du)} and ${parcoursVisite.debut} < ${debutJour(au, 1)}`,
      )
      .orderBy(sql`${parcoursVisite.derniere} desc`)
      .limit(AUDIENCE.visitesAvecErreurAffichees);
    const etapes = visitesErreur.length
      ? await this.db
          .select()
          .from(parcoursEtape)
          .where(
            sql`${parcoursEtape.visiteId} in (${sql.join(
              visitesErreur.map((v) => sql`${v.id}::uuid`),
              sql`, `,
            )})`,
          )
          .orderBy(parcoursEtape.visiteId, parcoursEtape.rang)
      : [];

    const ordre = new Map(EVENEMENTS_PARCOURS.map((code, i) => [code, i]));
    return {
      visites: resume?.visites ?? 0,
      pagesParVisite: resume?.pages ?? 0,
      dureeMedianeSecondes: resume?.duree ?? 0,
      entrees: entrees.map(({ valeur, nombre }) => ({ valeur, nombre })),
      sorties: sorties.map(({ valeur, nombre }) => ({ valeur, nombre })),
      enchainements: enchainements.map(({ de, vers, nombre }) => ({ de, vers, nombre })),
      evenements: evenements
        .filter((e): e is { code: EvenementParcours; visites: number } =>
          ordre.has(e.code as EvenementParcours),
        )
        .toSorted((a, b) => (ordre.get(a.code) ?? 0) - (ordre.get(b.code) ?? 0))
        .map(({ code, visites }) => ({ code, visites })),
      inscription: {
        visitesPageInscription: inscription[0]?.pages ?? 0,
        visitesInscrites: inscription[0]?.inscrites ?? 0,
      },
      avecErreur: visitesErreur.map((visite) => ({
        debut: visite.debut.toISOString(),
        provenance: visite.provenance,
        appareil: visite.appareil as Appareil,
        navigateur: visite.navigateur as Navigateur,
        systeme: visite.systeme as Systeme,
        etapes: etapes
          .filter((etape) => etape.visiteId === visite.id)
          .map((etape): EtapeVisiteApi => ({
            nature: etape.nature as NatureEtape,
            valeur: etape.valeur,
            detail: etape.detail,
            secondes: Math.max(
              0,
              Math.round((etape.date.getTime() - visite.debut.getTime()) / 1000),
            ),
          })),
      })),
    };
  }
}

/** Minuit UTC du jour donné (AAAA-MM-JJ), décalé de `plus` jours. */
const debutJour = (jour: string, plus = 0) =>
  sql`((${jour}::date + ${plus}::int)::timestamp at time zone 'UTC')`;

/** Ajoute 1 au compteur du jour (créé au premier passage). */
async function incrementer(
  db: Executeur,
  jour: string,
  mesure: MesureAudience,
  valeur: string,
  detail = '',
): Promise<void> {
  await db
    .insert(audienceCompteur)
    .values({ jour, mesure, valeur: valeur.slice(0, 160), detail: detail.slice(0, 160) })
    .onConflictDoUpdate({
      target: [
        audienceCompteur.jour,
        audienceCompteur.mesure,
        audienceCompteur.valeur,
        audienceCompteur.detail,
      ],
      set: { nombre: sql`${audienceCompteur.nombre} + 1` },
    });
}

/** Route de l'API, sans les identifiants (« POST /api/v1/creations/:id/publication »). */
function routeDe(requete: Request): string {
  const route = (requete.route as { path?: unknown } | undefined)?.path;
  const chemin = typeof route === 'string' ? route : '(route inconnue)';
  return `${requete.method} ${chemin}`.slice(0, 160);
}
