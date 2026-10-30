import { createHash } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';

/** Argon2id avec les paramètres minimaux recommandés par l'OWASP (19 Mio, 2 passes, 1 fil). */
const OPTIONS_ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const ADRESSE_HIBP = 'https://api.pwnedpasswords.com/range/';
const DELAI_HIBP_MS = 2_000;

/* Mots de passe (RG-04, ENF-05) : empreinte Argon2id, contrôle des fuites connues.
   Les contrôles locaux (liste intégrée, pseudo ou e-mail dans le mot de passe) sont dans le schéma partagé. */
@Injectable()
export class MotsDePasseService {
  private readonly journal = new Logger(MotsDePasseService.name);
  private empreinteFactice: Promise<string> | undefined;

  constructor(@Inject(CONFIG) private readonly config: Configuration) {}

  hacher(motDePasse: string): Promise<string> {
    return hash(motDePasse, OPTIONS_ARGON2);
  }

  async verifier(empreinte: string, motDePasse: string): Promise<boolean> {
    try {
      return await verify(empreinte, motDePasse);
    } catch {
      return false;
    }
  }

  /** Même durée de calcul quand aucun compte ne correspond : la réponse ne trahit pas l'existence du compte. */
  async verifierSansCompte(motDePasse: string): Promise<false> {
    this.empreinteFactice ??= this.hacher('vysora-empreinte-factice');
    await this.verifier(await this.empreinteFactice, motDePasse);
    return false;
  }

  /** RG-04 : base Have I Been Pwned par k-anonymat (seuls 5 caractères de l'empreinte SHA-1 sont envoyés).
      Si le service ne répond pas, l'inscription n'est pas bloquée : la liste intégrée a déjà été contrôlée. */
  async estCompromis(motDePasse: string): Promise<boolean> {
    if (this.config.VERIFICATION_FUITES !== 'hibp') return false;
    const empreinte = createHash('sha1').update(motDePasse).digest('hex').toUpperCase();
    const prefixe = empreinte.slice(0, 5);
    const suffixe = empreinte.slice(5);
    try {
      const reponse = await fetch(`${ADRESSE_HIBP}${prefixe}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'Vysora' },
        signal: AbortSignal.timeout(DELAI_HIBP_MS),
      });
      if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
      const lignes = (await reponse.text()).split('\n');
      return lignes.some((ligne) => {
        const [candidat, nombre] = ligne.trim().split(':');
        return candidat === suffixe && Number(nombre) > 0;
      });
    } catch (erreur) {
      this.journal.warn(`Contrôle des fuites indisponible : ${String(erreur)}`);
      return false;
    }
  }
}
