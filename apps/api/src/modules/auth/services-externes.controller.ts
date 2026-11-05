import { timingSafeEqual } from 'node:crypto';
import { Controller, Get, Inject, Logger, Param, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  INTENTIONS_SERVICE,
  estServiceExterne,
  type IntentionService,
  type ResultatService,
  type ServicesExternesApi,
} from '@vysora/shared';
import type { Response } from 'express';
import * as oidc from 'openid-client';
import { introuvable } from '../../commun/erreurs.js';
import { nomCookieSession, poserCookieSession } from '../../commun/securite/cookies.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { effacerAllerRetour, lireAllerRetour, poserAllerRetour } from './aller-retour-oauth.js';
import { FournisseursOAuth, type ProfilExterne } from './fournisseurs-oauth.js';
import { contexteDe, type RequeteVysora } from './requete.js';
import {
  adresseIssue,
  requeteArrivee,
  ServicesExternesService,
} from './services-externes.service.js';

/* Aller-retour vers GitHub et Google (F-02, S-10, ADR-0009). Le navigateur part de
   GET /api/v1/auth/:service (bouton de la connexion, de l'inscription ou des paramètres) et revient
   sur GET /api/v1/auth/:service/retour, l'adresse déclarée chez le service. Chaque issue renvoie
   vers une page du site : jamais d'erreur JSON pour une navigation. */
@Controller()
export class ServicesExternesController {
  private readonly journal = new Logger(ServicesExternesController.name);

  constructor(
    private readonly fournisseurs: FournisseursOAuth,
    private readonly servicesExternes: ServicesExternesService,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  /** GET /api/v1/services-externes : services configurés sur ce serveur. */
  @Get('services-externes')
  ouverts(): ServicesExternesApi {
    return { ouverts: this.fournisseurs.ouverts() };
  }

  /** GET /api/v1/auth/:service?intention=connexion|inscription|liaison&invitation=&retour=&pour= */
  @Get('auth/:service')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async partir(
    @Param('service') service: string,
    @Query() parametres: Record<string, unknown>,
    @Req() requete: RequeteVysora,
    @Res() reponse: Response,
  ): Promise<void> {
    if (!estServiceExterne(service)) throw introuvable();
    reponse.set('Cache-Control', 'no-store');
    const intention: IntentionService = INTENTIONS_SERVICE.includes(
      parametres.intention as IntentionService,
    )
      ? (parametres.intention as IntentionService)
      : 'connexion';
    const arrivee = requeteArrivee(parametres.retour, parametres.pour);
    const vers = (resultat: ResultatService) =>
      reponse.redirect(302, adresseIssue(intention, service, { resultat }, arrivee));

    if (!this.fournisseurs.ouverts().includes(service)) return vers('indisponible');
    if (intention === 'liaison' && !this.peutLier(requete))
      return reponse.redirect(302, '/connexion?retour=%2Fparametres');

    const invitation =
      intention === 'inscription' && typeof parametres.invitation === 'string'
        ? parametres.invitation.trim().toUpperCase().slice(0, 32) || undefined
        : undefined;
    const secrets = {
      state: oidc.randomState(),
      verificateur: oidc.randomPKCECodeVerifier(),
      nonce: oidc.randomNonce(),
    };
    let autorisation: URL;
    try {
      autorisation = await this.fournisseurs.urlAutorisation(service, secrets);
    } catch (erreur) {
      this.journal.warn(`Départ vers ${service} impossible : ${String(erreur)}`);
      return vers('indisponible');
    }
    poserAllerRetour(reponse, this.config, {
      service,
      intention,
      ...secrets,
      invitation,
      requete: arrivee,
    });
    reponse.redirect(302, autorisation.toString());
  }

  /** GET /api/v1/auth/:service/retour?code=&state= (ou ?error= si la personne a refusé). */
  @Get('auth/:service/retour')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async revenir(
    @Param('service') service: string,
    @Req() requete: RequeteVysora,
    @Res() reponse: Response,
  ): Promise<void> {
    if (!estServiceExterne(service)) throw introuvable();
    reponse.set('Cache-Control', 'no-store');
    const allerRetour = lireAllerRetour(requete, this.config);
    effacerAllerRetour(reponse, this.config);
    // Sans le cookie de départ (délai dépassé, autre navigateur, retour forgé) : rien n'est fait.
    if (!allerRetour || allerRetour.service !== service)
      return reponse.redirect(
        302,
        adresseIssue('connexion', service, { resultat: 'indisponible' }),
      );

    const { intention } = allerRetour;
    const vers = (resultat: ResultatService) =>
      reponse.redirect(302, adresseIssue(intention, service, { resultat }, allerRetour.requete));
    const parametres = new URL(requete.originalUrl, 'http://api.invalid').searchParams;
    if (parametres.has('error')) return vers('indisponible');
    // Le `state` revenu doit être celui de ce navigateur (falsification de connexion) ; la
    // bibliothèque le vérifie aussi, ce contrôle ne dépend pas d'elle.
    if (!memeValeur(parametres.get('state'), allerRetour.state)) return vers('indisponible');

    let profil: ProfilExterne;
    try {
      profil = await this.fournisseurs.profil(service, parametres, allerRetour);
    } catch (erreur) {
      this.journal.warn(`Retour de ${service} refusé : ${String(erreur)}`);
      return vers('indisponible');
    }

    try {
      if (intention === 'liaison') {
        const ouverte = requete.sessionOuverte;
        if (!ouverte || !this.peutLier(requete))
          return reponse.redirect(302, '/connexion?retour=%2Fparametres');
        return vers(await this.servicesExternes.lier(ouverte.utilisateur.id, service, profil));
      }
      const issue = await this.servicesExternes.connecterOuInscrire({
        service,
        intention,
        profil,
        invitation: allerRetour.invitation,
        requete: allerRetour.requete,
        contexte: contexteDe(requete),
        jetonActuel: this.jetonDe(requete),
      });
      if (issue.session)
        poserCookieSession(reponse, this.config, issue.session.jeton, issue.session.expiration);
      reponse.redirect(302, issue.adresse);
    } catch (erreur) {
      this.journal.error(`Retour de ${service} non traité : ${String(erreur)}`);
      vers('indisponible');
    }
  }

  /** La liaison ajoute un moyen de connexion : il faut une session, et pour l'équipe une identité
      confirmée par la double authentification (ENF-05). */
  private peutLier(requete: RequeteVysora): boolean {
    const ouverte = requete.sessionOuverte;
    if (!ouverte) return false;
    const equipe = ['MODERATEUR', 'ADMINISTRATEUR'].includes(ouverte.utilisateur.role);
    return !equipe || ouverte.deuxFacteursValide;
  }

  private jetonDe(requete: RequeteVysora): string | undefined {
    const jeton: unknown = requete.cookies?.[nomCookieSession(this.config)];
    return typeof jeton === 'string' && jeton ? jeton : undefined;
  }
}

/** Comparaison en temps constant. */
function memeValeur(recue: string | null, attendue: string): boolean {
  if (!recue) return false;
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  return a.length === b.length && timingSafeEqual(a, b);
}
