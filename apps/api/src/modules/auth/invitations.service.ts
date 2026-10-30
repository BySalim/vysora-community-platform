import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { InvitationApi } from '@vysora/shared';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { badge, invitation, obtentionBadge } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/** Caractères d'un code, sans ceux qui se confondent à la lecture (0 et O, 1 et I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const tirer = (n: number) =>
  Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** INV-01 : « VYS-K7M2-Q9 ». */
export const genererCodeInvitation = (): string => `VYS-${tirer(4)}-${tirer(2)}`;

export const CODE_INVALIDE =
  'Ce code n’est pas valable. Vérifiez-le, ou demandez une nouvelle invitation.';

/* Bêta fermée sur invitation (INV-01) : un code sert une fois, avant sa date d'expiration ; le membre
   inscrit avec un code reçoit le badge « Pionnier ». */
@Injectable()
export class InvitationsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  private libre(code: string, maintenant: Date) {
    return and(
      eq(invitation.code, code),
      isNull(invitation.dateUtilisation),
      or(isNull(invitation.dateExpiration), gt(invitation.dateExpiration, maintenant)),
    );
  }

  /** Lien d'invitation : le code est-il libre, et qui invite ? */
  async lire(code: string, maintenant = new Date()): Promise<InvitationApi> {
    const [ligne] = await this.db
      .select({ createurId: invitation.createurId })
      .from(invitation)
      .where(this.libre(code.toUpperCase(), maintenant));
    if (!ligne) return { valable: false, par: null };
    const createur = ligne.createurId
      ? (await resumerMembres(this.db, this.stockage, [ligne.createurId])).get(ligne.createurId)
      : undefined;
    return { valable: true, par: createur ? { nom: createur.nom, avatar: createur.avatar } : null };
  }

  async estLibre(code: string, maintenant = new Date()): Promise<boolean> {
    return (await this.lire(code, maintenant)).valable;
  }

  /** Consomme le code pour le nouveau compte et lui donne le badge « Pionnier » ; faux si le code
      n'est plus libre (déjà utilisé entre-temps, ou expiré). */
  async utiliser(tx: Executeur, code: string, utilisateurId: number): Promise<boolean> {
    const pris = await tx
      .update(invitation)
      .set({ dateUtilisation: new Date(), utilisateurId })
      .where(this.libre(code.toUpperCase(), new Date()))
      .returning({ id: invitation.id });
    if (!pris.length) return false;
    await tx.execute(sql`
      insert into ${obtentionBadge} (utilisateur_id, badge_id)
      select ${utilisateurId}, ${badge.id} from ${badge} where ${badge.code} = 'PIONNIER'
      on conflict do nothing`);
    return true;
  }

  /** Crée des codes (commande pnpm invitations:creer, puis l'administration avec ADM-01). */
  async creer(nombre: number, createurId: number | null = null, expiration: Date | null = null) {
    const codes: string[] = [];
    while (codes.length < nombre) {
      const code = genererCodeInvitation();
      const [cree] = await this.db
        .insert(invitation)
        .values({ code, createurId, dateExpiration: expiration })
        .onConflictDoNothing()
        .returning({ code: invitation.code });
      if (cree) codes.push(cree.code);
    }
    return codes;
  }
}
