import { Inject, Injectable } from '@nestjs/common';
import { DELAIS, type Connexion, type SessionApi } from '@vysora/shared';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ErreurApplication, interdit } from '../../commun/erreurs.js';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { tentativeConnexion, utilisateur } from '../../db/schema/index.js';
import { EtatVisiteurService } from './etat-visiteur.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import { SessionsService } from './sessions.service.js';

/** F-03 : nombre d'échecs consécutifs avant temporisation. */
const ECHECS_AVANT_TEMPORISATION = DELAIS.echecsConnexionAvantTemporisation;

/* Connexion par e-mail et mot de passe (F-03). Le même message d'erreur et la même durée de calcul,
   que l'adresse corresponde à un compte ou non ; après 5 échecs consécutifs pour une même adresse,
   chaque nouvelle tentative attend 30 secondes. */
@Injectable()
export class ConnexionService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly etats: EtatVisiteurService,
  ) {}

  async connecter(
    { email, motDePasse }: Connexion,
    requete: Request,
    reponse: Response,
  ): Promise<SessionApi> {
    const identifiant = empreinteSalee(
      this.config.SEL_EMPREINTES,
      `connexion:${email.toLowerCase()}`,
    );
    this.refuserSiTemporise(await this.attente(identifiant));

    const [compte] = await this.db
      .select({
        id: utilisateur.id,
        empreinte: utilisateur.empreinteMotDePasse,
        statut: utilisateur.statutCompte,
      })
      .from(utilisateur)
      .where(sql`lower(${utilisateur.email}) = ${email.toLowerCase()}`);
    const valide = compte?.empreinte
      ? await this.motsDePasse.verifier(compte.empreinte, motDePasse)
      : await this.motsDePasse.verifierSansCompte(motDePasse);

    await this.db.insert(tentativeConnexion).values({
      utilisateurId: compte?.id ?? null,
      empreinteIdentifiant: identifiant,
      empreinteIp: requete.ip ? empreinteSalee(this.config.SEL_EMPREINTES, requete.ip) : null,
      reussie: valide,
    });
    if (!compte || !valide) {
      // Le cinquième échec suspend déjà la connexion (prototype : le bouton affiche le compte à rebours).
      this.refuserSiTemporise(await this.attente(identifiant));
      throw new ErreurApplication('IDENTIFIANTS_INCORRECTS');
    }
    if (compte.statut === 'BANNI')
      throw interdit('Ce compte a été fermé à la suite d’une décision de modération.');

    await this.db
      .update(utilisateur)
      .set({ dateDerniereConnexion: new Date() })
      .where(eq(utilisateur.id, compte.id));
    await this.sessions.ouvrir(compte.id, requete, reponse);
    return this.etats.pour(compte.id);
  }

  /** Secondes à attendre : 0 tant que moins de 5 échecs consécutifs récents (depuis la dernière réussite). */
  private async attente(identifiant: string, maintenant = Date.now()): Promise<number> {
    const debut = new Date(maintenant - DELAIS.fenetreEchecsConnexionMinutes * 60_000);
    const derniereReussite = this.db
      .select({ date: sql`max(${tentativeConnexion.date})` })
      .from(tentativeConnexion)
      .where(
        and(
          eq(tentativeConnexion.empreinteIdentifiant, identifiant),
          eq(tentativeConnexion.reussie, true),
        ),
      );
    const [echecs] = await this.db
      .select({
        nombre: sql<number>`count(*)`.mapWith(Number),
        dernier: sql<Date | null>`max(${tentativeConnexion.date})`.mapWith(tentativeConnexion.date),
      })
      .from(tentativeConnexion)
      .where(
        and(
          eq(tentativeConnexion.empreinteIdentifiant, identifiant),
          eq(tentativeConnexion.reussie, false),
          gt(tentativeConnexion.date, debut),
          sql`${tentativeConnexion.date} > coalesce((${derniereReussite}), '-infinity')`,
        ),
      );
    if (!echecs?.dernier || echecs.nombre < ECHECS_AVANT_TEMPORISATION) return 0;
    const ecoule = (maintenant - echecs.dernier.getTime()) / 1000;
    return Math.max(0, Math.ceil(DELAIS.temporisationConnexionSecondes - ecoule));
  }

  private refuserSiTemporise(secondes: number): void {
    if (secondes > 0)
      throw new ErreurApplication(
        'TROP_DE_REQUETES',
        'La connexion est suspendue quelques instants.',
        undefined,
        { reessayerDans: secondes },
      );
  }
}
