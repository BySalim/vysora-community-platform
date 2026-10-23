import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { hash, verify, type Options } from '@node-rs/argon2';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';

/** Argon2id, paramètres recommandés par l'OWASP (19 Mio, 2 passes, 1 fil) : ENF-05, RG-04.
    2 = Algorithm.Argon2id, énumération constante que la compilation fichier par fichier ne peut pas lire. */
const ARGON2: Options = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Service Have I Been Pwned : seuls les 5 premiers caractères de l'empreinte SHA-1 sont envoyés. */
const SERVICE_FUITES = 'https://api.pwnedpasswords.com/range/';
const DELAI_SERVICE_FUITES_MS = 3_000;

/** Empreinte Argon2id d'un mot de passe (comptes, données de démonstration). */
export const hacherMotDePasse = (motDePasse: string): Promise<string> => hash(motDePasse, ARGON2);

@Injectable()
export class MotsDePasseService {
  private readonly journal = new Logger(MotsDePasseService.name);
  private empreinteFactice?: Promise<string>;

  constructor(@Inject(CONFIG) private readonly config: Configuration) {}

  hacher(motDePasse: string): Promise<string> {
    return hacherMotDePasse(motDePasse);
  }

  /** Sans empreinte (compte inconnu, compte externe), le calcul a lieu quand même : la durée de
      la réponse ne révèle pas si l'adresse possède un compte. */
  async verifier(empreinte: string | null | undefined, motDePasse: string): Promise<boolean> {
    if (!empreinte) {
      this.empreinteFactice ??= this.hacher(randomBytes(32).toString('base64url'));
      await verify(await this.empreinteFactice, motDePasse).catch(() => false);
      return false;
    }
    return verify(empreinte, motDePasse).catch(() => false);
  }

  /** RG-04 : le mot de passe figure-t-il dans une fuite connue ? En cas de panne du service,
      l'inscription n'est pas bloquée (le contrôle local de @vysora/shared s'applique toujours). */
  async estDansUneFuite(motDePasse: string): Promise<boolean> {
    if (!this.config.VERIFIER_FUITES) return false;
    const empreinte = createHash('sha1').update(motDePasse).digest('hex').toUpperCase();
    const prefixe = empreinte.slice(0, 5);
    const suffixe = empreinte.slice(5);
    try {
      const reponse = await fetch(`${SERVICE_FUITES}${prefixe}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'Vysora' },
        signal: AbortSignal.timeout(DELAI_SERVICE_FUITES_MS),
      });
      if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
      return contientSuffixe(await reponse.text(), suffixe);
    } catch (erreur) {
      this.journal.warn(`Service des fuites de mots de passe indisponible : ${String(erreur)}`);
      return false;
    }
  }
}

/** Lignes « SUFFIXE:NOMBRE » ; les lignes de remplissage (Add-Padding) ont un nombre nul. */
export function contientSuffixe(corps: string, suffixe: string): boolean {
  return corps.split('\n').some((ligne) => {
    const [candidat, nombre] = ligne.trim().split(':');
    return candidat === suffixe && Number(nombre) > 0;
  });
}
