import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  raisonRefus,
  type ActionReservee,
  type RaisonRefus,
  type SessionApi,
} from '@vysora/shared';
import type { Request, Response } from 'express';
import { ErreurApplication } from '../../commun/erreurs.js';
import { EtatVisiteurService, SESSION_VISITEUR } from './etat-visiteur.service.js';
import { SessionsService } from './sessions.service.js';
import { EXIGE } from './visiteur.js';

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function detailRefus(raison: Exclude<RaisonRefus, 'connexion'>, session: SessionApi): string {
  switch (raison) {
    case 'email':
      return 'Confirmez votre adresse e-mail pour publier, voter et répondre.';
    case 'conditions':
      return 'Acceptez les nouvelles conditions pour publier et participer.';
    case 'suspendu': {
      const fin = session.membre?.suspenduJusqua;
      return fin
        ? `Votre compte est suspendu jusqu’au ${DATE_LONGUE.format(new Date(fin))}.`
        : 'Votre compte est suspendu.';
    }
    case 'niveau':
      return 'Cette action est réservée aux membres de niveau Expert et plus.';
    case 'role':
      return 'Cette action est réservée à l’équipe de Vysora.';
  }
}

/* Garde globale (AUTH-01, AUTH-06) : retrouve la session du cookie, puis applique le droit exigé
   par la route (@Exige) avec les mêmes règles que l'interface (raisonRefus de @vysora/shared).
   Une requête sans cookie ne coûte aucune lecture en base. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflecteur: Reflector,
    private readonly sessions: SessionsService,
    private readonly etats: EtatVisiteurService,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const http = contexte.switchToHttp();
    const requete = http.getRequest<Request>();
    const ouverte = await this.sessions.retrouver(requete, http.getResponse<Response>());
    requete.visiteur = ouverte
      ? { sessionId: ouverte.id, utilisateurId: ouverte.utilisateurId }
      : null;

    const action = this.reflecteur.getAllAndOverride<ActionReservee | undefined>(EXIGE, [
      contexte.getHandler(),
      contexte.getClass(),
    ]);
    if (!action) return true;

    const session = ouverte ? await this.etats.pour(ouverte.utilisateurId) : SESSION_VISITEUR;
    if (requete.visiteur) requete.visiteur.session = session;
    const raison = raisonRefus(action, session.etat);
    if (!raison) return true;
    if (raison === 'connexion')
      throw new ErreurApplication('NON_AUTHENTIFIE', undefined, undefined, { raison });
    throw new ErreurApplication('INTERDIT', detailRefus(raison, session), undefined, { raison });
  }
}
