import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ServiceExterne } from '@vysora/shared';
import * as oidc from 'openid-client';
import { z } from 'zod';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';

/* Échanges avec GitHub et Google (F-02, S-10, ADR-0009) : adresse d'autorisation, puis, au retour,
   échange du code contre un jeton et lecture de l'identité. Protections : `state` (lié au
   navigateur par un cookie chiffré), PKCE S256 pour les deux services, `nonce` et contrôle du
   jeton d'identité (émetteur, audience, expiration) pour Google. Le jeton d'accès ne sert qu'à lire
   l'identité : il n'est jamais conservé. Les tests remplacent ce service par un double. */

/** Personne telle que le service la décrit après son autorisation. */
export interface ProfilExterne {
  /** Identifiant stable chez le service (id GitHub, `sub` Google) ; jamais l'adresse, qui change. */
  identifiant: string;
  /** Adresse vérifiée par le service ; null s'il n'en fournit aucune. */
  email: string | null;
  /** Identifiant GitHub ou adresse Google, montré dans les paramètres. */
  nomCompte: string | null;
}

/** Secrets d'un aller-retour, gardés dans le cookie chiffré jusqu'au retour. */
export interface SecretsAllerRetour {
  state: string;
  verificateur: string;
  nonce: string;
}

/** Adresse de retour déclarée chez le service : celle du site (même origine, ADR-0007). */
export const adresseRetour = (siteUrl: string, service: ServiceExterne): string =>
  new URL(`/api/v1/auth/${service}/retour`, siteUrl).toString();

const DELAI_SECONDES = 15;

const GITHUB: oidc.ServerMetadata = {
  issuer: 'https://github.com/login/oauth',
  authorization_endpoint: 'https://github.com/login/oauth/authorize',
  token_endpoint: 'https://github.com/login/oauth/access_token',
};
const GOOGLE = new URL('https://accounts.google.com');

const utilisateurGithub = z.object({ id: z.number().int(), login: z.string().max(255) });
const adressesGithub = z.array(
  z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }),
);

@Injectable()
export class FournisseursOAuth {
  private readonly journal = new Logger(FournisseursOAuth.name);
  private readonly configurations = new Map<ServiceExterne, Promise<oidc.Configuration>>();

  constructor(@Inject(CONFIG) private readonly config: Configuration) {}

  /** Services dont les identifiants sont configurés sur ce serveur. */
  ouverts(): ServiceExterne[] {
    const ouverts: ServiceExterne[] = [];
    if (this.config.GITHUB_CLIENT_ID && this.config.GITHUB_CLIENT_SECRET) ouverts.push('github');
    if (this.config.GOOGLE_CLIENT_ID && this.config.GOOGLE_CLIENT_SECRET) ouverts.push('google');
    return ouverts;
  }

  async urlAutorisation(service: ServiceExterne, secrets: SecretsAllerRetour): Promise<URL> {
    const configuration = await this.configuration(service);
    const parametres: Record<string, string> = {
      redirect_uri: adresseRetour(this.config.SITE_URL, service),
      state: secrets.state,
      code_challenge: await oidc.calculatePKCECodeChallenge(secrets.verificateur),
      code_challenge_method: 'S256',
    };
    if (service === 'github') {
      // Adresses seulement (pour l'adresse principale vérifiée) : l'identité publique se lit sans
      // portée ; aucun accès aux dépôts ni au profil privé.
      parametres.scope = 'user:email';
    } else {
      parametres.scope = 'openid email';
      parametres.nonce = secrets.nonce;
      // Plusieurs comptes Google ouverts : la personne choisit lequel.
      parametres.prompt = 'select_account';
    }
    return oidc.buildAuthorizationUrl(configuration, parametres);
  }

  /** Échange le code reçu au retour (`parametresRetour` : la requête du retour) et lit l'identité.
      Lève une erreur si le service refuse, si `state` ou le jeton d'identité ne conviennent pas. */
  async profil(
    service: ServiceExterne,
    parametresRetour: URLSearchParams,
    secrets: SecretsAllerRetour,
  ): Promise<ProfilExterne> {
    const configuration = await this.configuration(service);
    // L'adresse de retour exacte est celle de l'autorisation, quelle que soit l'adresse interne
    // par laquelle la requête est arrivée à l'API (relais, Caddy).
    const retour = new URL(adresseRetour(this.config.SITE_URL, service));
    retour.search = parametresRetour.toString();

    if (service === 'google') {
      const jetons = await oidc.authorizationCodeGrant(configuration, retour, {
        expectedState: secrets.state,
        expectedNonce: secrets.nonce,
        pkceCodeVerifier: secrets.verificateur,
        idTokenExpected: true,
      });
      const revendications = jetons.claims();
      if (!revendications) throw new Error('Google n’a pas fourni de jeton d’identité');
      const email = typeof revendications.email === 'string' ? revendications.email : null;
      return {
        identifiant: revendications.sub,
        email: email && revendications.email_verified === true ? email : null,
        nomCompte: email,
      };
    }

    const jetons = await oidc.authorizationCodeGrant(configuration, retour, {
      expectedState: secrets.state,
      pkceCodeVerifier: secrets.verificateur,
    });
    return this.profilGithub(jetons.access_token);
  }

  private async profilGithub(jeton: string): Promise<ProfilExterne> {
    const lire = async (adresse: string): Promise<unknown> => {
      const reponse = await fetch(adresse, {
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Vysora',
        },
        signal: AbortSignal.timeout(DELAI_SECONDES * 1000),
      });
      if (!reponse.ok) throw new Error(`GitHub a répondu ${reponse.status} à ${adresse}`);
      return reponse.json();
    };
    const [brutUtilisateur, brutAdresses] = await Promise.all([
      lire('https://api.github.com/user'),
      lire('https://api.github.com/user/emails'),
    ]);
    const compte = utilisateurGithub.parse(brutUtilisateur);
    const adresses = adressesGithub.parse(brutAdresses).filter((adresse) => adresse.verified);
    const adresse = adresses.find((candidate) => candidate.primary) ?? adresses[0];
    return {
      identifiant: String(compte.id),
      email: adresse?.email ?? null,
      nomCompte: compte.login,
    };
  }

  /** Configuration du client, préparée une fois ; celle de Google se lit chez Google (découverte),
      et une découverte échouée sera retentée à la prochaine demande. */
  private configuration(service: ServiceExterne): Promise<oidc.Configuration> {
    const existante = this.configurations.get(service);
    if (existante) return existante;
    const id = service === 'github' ? this.config.GITHUB_CLIENT_ID : this.config.GOOGLE_CLIENT_ID;
    const secret =
      service === 'github' ? this.config.GITHUB_CLIENT_SECRET : this.config.GOOGLE_CLIENT_SECRET;
    if (!id || !secret) return Promise.reject(new Error(`Service ${service} non configuré`));

    const preparee =
      service === 'github'
        ? Promise.resolve(new oidc.Configuration(GITHUB, id, secret))
        : oidc.discovery(GOOGLE, id, secret, undefined, { timeout: DELAI_SECONDES });
    const configuree = preparee.then((configuration) => {
      configuration.timeout = DELAI_SECONDES;
      return configuration;
    });
    configuree.catch((erreur: unknown) => {
      this.journal.warn(`Configuration de ${service} impossible : ${String(erreur)}`);
      this.configurations.delete(service);
    });
    this.configurations.set(service, configuree);
    return configuree;
  }
}
