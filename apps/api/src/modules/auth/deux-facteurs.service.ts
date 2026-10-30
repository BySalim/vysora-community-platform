import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivationDeuxFacteursApi,
  CodeDeuxFacteurs,
  ConfigurationDeuxFacteursApi,
} from '@vysora/shared';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { conflit, erreurValidation } from '../../commun/erreurs.js';
import { chiffrer, dechiffrer } from '../../commun/securite/chiffrement.js';
import { sha256 } from '../../commun/securite/empreintes.js';
import { adresseOtpauth, nouvelleCle, verifierTotp } from '../../commun/securite/totp.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { doubleAuthentification, session } from '../../db/schema/index.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeSecours = () =>
  Array.from(
    { length: 8 },
    (_, i) => `${i === 4 ? '-' : ''}${ALPHABET[randomInt(ALPHABET.length)]}`,
  ).join('');

export const CODE_REFUSE = 'Ce code ne correspond pas. Attendez le suivant, puis réessayez.';
export const SECOURS_REFUSE = 'Ce code de secours n’est pas valable ou a déjà servi.';

export type StatutDeuxFacteurs = 'active' | 'en-attente' | 'absente';

/* Double authentification (SEC-02, ENF-05) : obligatoire pour la modération et l'administration.
   Secret TOTP chiffré (AES-256-GCM, CLE_CHIFFREMENT), huit codes de secours dont seule l'empreinte
   est gardée, code déjà utilisé refusé. Une session vérifiée porte deux_facteurs_valide. */
@Injectable()
export class DeuxFacteursService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  async statut(utilisateurId: number): Promise<StatutDeuxFacteurs> {
    const [ligne] = await this.db
      .select({ activation: doubleAuthentification.dateActivation })
      .from(doubleAuthentification)
      .where(eq(doubleAuthentification.utilisateurId, utilisateurId));
    return !ligne ? 'absente' : ligne.activation ? 'active' : 'en-attente';
  }

  /** Nouvelle clé, en attente de confirmation ; refusé si la double authentification est active. */
  async configurer(utilisateurId: number, compte: string): Promise<ConfigurationDeuxFacteursApi> {
    if ((await this.statut(utilisateurId)) === 'active')
      throw conflit('La vérification en deux étapes est déjà activée sur ce compte.');
    const cle = nouvelleCle();
    const secretChiffre = chiffrer(this.config.CLE_CHIFFREMENT, cle);
    await this.db
      .insert(doubleAuthentification)
      .values({ utilisateurId, secretChiffre })
      .onConflictDoUpdate({
        target: doubleAuthentification.utilisateurId,
        set: { secretChiffre, dateActivation: null, codesSecours: [], dernierPas: null },
      });
    return { cle, adresse: adresseOtpauth(cle, compte) };
  }

  /** Premier code juste : la double authentification est active, la session vérifiée, et les codes
      de secours sont rendus une seule fois. */
  async activer(
    utilisateurId: number,
    sessionId: string,
    code: string,
  ): Promise<ActivationDeuxFacteursApi['codesSecours']> {
    const [ligne] = await this.db
      .select()
      .from(doubleAuthentification)
      .where(eq(doubleAuthentification.utilisateurId, utilisateurId));
    if (!ligne || ligne.dateActivation)
      throw conflit('Commencez par afficher la clé à saisir dans votre application.');
    const pas = verifierTotp(dechiffrer(this.config.CLE_CHIFFREMENT, ligne.secretChiffre), code);
    if (pas === null) throw erreurValidation({ code: CODE_REFUSE });
    const codes = Array.from({ length: 8 }, codeSecours);
    await this.db.transaction(async (tx) => {
      await tx
        .update(doubleAuthentification)
        .set({ dateActivation: new Date(), codesSecours: codes.map(sha256), dernierPas: pas })
        .where(eq(doubleAuthentification.utilisateurId, utilisateurId));
      await tx.update(session).set({ deuxFacteursValide: true }).where(eq(session.id, sessionId));
    });
    return codes;
  }

  /** Vérifie un code de l'application ou un code de secours (consommé) pour la session. */
  async verifier(
    utilisateurId: number,
    sessionId: string,
    saisie: CodeDeuxFacteurs,
  ): Promise<void> {
    const [ligne] = await this.db
      .select()
      .from(doubleAuthentification)
      .where(eq(doubleAuthentification.utilisateurId, utilisateurId));
    if (!ligne?.dateActivation) throw conflit('Activez d’abord la vérification en deux étapes.');
    // La mise à jour n'aboutit que si le code n'a pas servi entre-temps : deux requêtes simultanées
    // avec le même code ne passent pas toutes les deux.
    const accepte = await this.db.transaction(async (tx) => {
      let consomme: { id: number }[];
      if (saisie.code) {
        const pas = verifierTotp(
          dechiffrer(this.config.CLE_CHIFFREMENT, ligne.secretChiffre),
          saisie.code,
        );
        if (pas === null) return false;
        consomme = await tx
          .update(doubleAuthentification)
          .set({ dernierPas: pas })
          .where(
            and(
              eq(doubleAuthentification.utilisateurId, utilisateurId),
              or(
                isNull(doubleAuthentification.dernierPas),
                lt(doubleAuthentification.dernierPas, pas),
              ),
            ),
          )
          .returning({ id: doubleAuthentification.utilisateurId });
      } else {
        const empreinte = sha256(saisie.codeSecours ?? '');
        consomme = await tx
          .update(doubleAuthentification)
          .set({ codesSecours: sql`${doubleAuthentification.codesSecours} - ${empreinte}::text` })
          .where(
            and(
              eq(doubleAuthentification.utilisateurId, utilisateurId),
              sql`${doubleAuthentification.codesSecours} ? ${empreinte}`,
            ),
          )
          .returning({ id: doubleAuthentification.utilisateurId });
      }
      if (consomme.length === 0) return false;
      await tx.update(session).set({ deuxFacteursValide: true }).where(eq(session.id, sessionId));
      return true;
    });
    if (!accepte)
      throw erreurValidation(saisie.code ? { code: CODE_REFUSE } : { codeSecours: SECOURS_REFUSE });
  }
}
