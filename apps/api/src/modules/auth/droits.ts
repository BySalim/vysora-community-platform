import {
  Injectable,
  SetMetadata,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { raisonRefus, type ActionReservee, type RaisonRefus } from '@vysora/shared';
import { ErreurApplication } from '../../commun/erreurs.js';
import { EtatCompteService } from './etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from './requete.js';

/* AUTH-06 : contrôle des droits côté API, seule autorité (ADR-0003). Une route réservée déclare
   l'action qu'elle demande ; la garde applique raisonRefus (@vysora/shared), la même règle que
   celle dont le site se sert pour adapter l'affichage. */

const CLE_EXIGE = 'vysora:exige';

/** La route demande cette action : @Exige('contribuer'), @Exige('parametres'), @Exige('moderer')… */
export const Exige = (action: ActionReservee) => SetMetadata(CLE_EXIGE, action);

const DETAIL_REFUS: Record<RaisonRefus, string> = {
  connexion: 'Connectez-vous pour continuer.',
  email: 'Confirmez votre adresse e-mail pour continuer : ouvrez le lien reçu à l’inscription.',
  conditions:
    'Acceptez les nouvelles conditions d’utilisation et la charte communautaire pour continuer.',
  suspendu: 'Votre compte est suspendu : vous gardez l’accès à la lecture et à vos paramètres.',
  niveau: 'Cette action se débloque avec le niveau Expert.',
  role: 'Cette action est réservée à la modération.',
};

export function refus(raison: RaisonRefus, action?: ActionReservee): ErreurApplication {
  const detail =
    raison === 'role' && action === 'administrer'
      ? 'Cette action est réservée à l’administration.'
      : DETAIL_REFUS[raison];
  return new ErreurApplication(
    raison === 'connexion' ? 'NON_AUTHENTIFIE' : 'INTERDIT',
    detail,
    undefined,
    { raison },
  );
}

@Injectable()
export class DroitsGuard implements CanActivate {
  constructor(
    private readonly reflecteur: Reflector,
    private readonly etatCompte: EtatCompteService,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const action = this.reflecteur.getAllAndOverride<ActionReservee | undefined>(CLE_EXIGE, [
      contexte.getHandler(),
      contexte.getClass(),
    ]);
    if (!action) return true;
    const requete = contexte.switchToHttp().getRequest<RequeteVysora>();
    const { etat } = await this.etatCompte.pour(requete);
    // La double authentification (SEC-02) s'ajoutera ici pour « moderer » et « administrer ».
    const raison = raisonRefus(action, etat);
    if (raison) throw refus(raison, action);
    return true;
  }
}

/** Session de la personne connectée, dans une route protégée par @Exige. */
export const SessionCourante = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): SessionOuverte => {
    const session = contexte.switchToHttp().getRequest<RequeteVysora>().sessionOuverte;
    if (!session) throw refus('connexion');
    return session;
  },
);
