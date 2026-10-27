import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  MOTIF_PSEUDO,
  schemaProfilPublic,
  type ProfilApi,
  type ProfilPublicApi,
  type ProfilPublicSaisi,
} from '@vysora/shared';
import { introuvable } from '../../commun/erreurs.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import { EtatCompteService } from '../auth/etat-compte.service.js';
import type { RequeteVysora, SessionOuverte } from '../auth/requete.js';
import { ProfilService } from './profil.service.js';

/* Profil public (PROF-01, F-05, F-73, F-74, EC-14). */
@Controller()
export class ProfilController {
  constructor(
    private readonly profils: ProfilService,
    private readonly etatCompte: EtatCompteService,
  ) {}

  /** GET /api/v1/membres/:pseudo : profil public ; sa progression pour le propriétaire (RG-88). */
  @Get('membres/:pseudo')
  async lire(@Param('pseudo') pseudo: string, @Req() requete: RequeteVysora): Promise<ProfilApi> {
    if (pseudo.length > 30 || !MOTIF_PSEUDO.test(pseudo))
      throw introuvable('Ce profil est introuvable.');
    const session = requete.sessionOuverte;
    const lecteur = session
      ? { id: session.utilisateur.id, etat: (await this.etatCompte.pour(requete)).etat }
      : null;
    return this.profils.profil(pseudo, lecteur);
  }

  /** PATCH /api/v1/moi/profil : biographie et lien personnel, publics (« contribuer »). */
  @Patch('moi/profil')
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  modifier(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaProfilPublic)) saisie: ProfilPublicSaisi,
  ): Promise<ProfilPublicApi> {
    return this.profils.modifier(session.utilisateur.id, saisie);
  }
}
