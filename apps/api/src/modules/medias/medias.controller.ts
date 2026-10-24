import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  schemaDescriptionImage,
  type AvatarApi,
  type DescriptionImage,
  type MediaApi,
} from '@vysora/shared';
import type { Request, Response } from 'express';
import { introuvable } from '../../commun/erreurs.js';
import { IdentifiantPipe } from '../../commun/http/identifiant.pipe.js';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { MediasService } from './medias.service.js';
import { ReceptionImage, fichierRecu } from './reception-image.interceptor.js';
import { Stockage } from './stockage.js';

/* Images des contenus (F-15, RG-16) : téléversées dès leur dépôt dans un éditeur, décrites ensuite. */
@Controller('medias')
export class MediasController {
  constructor(private readonly medias: MediasService) {}

  /** POST /api/v1/medias (multipart/form-data : fichier, texteAlternatif, legende). */
  @Post()
  @HttpCode(201)
  @Exige('contribuer')
  @Throttle({ default: { limit: 60, ttl: 10 * 60_000 } })
  @UseInterceptors(ReceptionImage)
  televerser(
    @SessionCourante() session: SessionOuverte,
    @Req() requete: Request,
    @Body(new ValidationZod(schemaDescriptionImage)) description: DescriptionImage,
  ): Promise<MediaApi> {
    return this.medias.televerser(session.utilisateur.id, fichierRecu(requete), description);
  }

  /** PATCH /api/v1/medias/:id : texte alternatif et légende. */
  @Patch(':id')
  @Exige('contribuer')
  decrire(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
    @Body(new ValidationZod(schemaDescriptionImage)) description: DescriptionImage,
  ): Promise<MediaApi> {
    return this.medias.decrire(session.utilisateur.id, id, description);
  }

  /** DELETE /api/v1/medias/:id : image déposée puis retirée avant l'enregistrement du contenu. */
  @Delete(':id')
  @HttpCode(204)
  @Exige('contribuer')
  retirer(
    @SessionCourante() session: SessionOuverte,
    @Param('id', IdentifiantPipe) id: number,
  ): Promise<void> {
    return this.medias.retirer(session.utilisateur.id, id);
  }
}

/* F-05 : photo de profil du membre connecté. La modifier demande les mêmes droits que contribuer
   (prototype : « modifier votre profil ») ; la retirer reste possible en lecture seule. */
@Controller('moi/avatar')
export class AvatarController {
  constructor(private readonly medias: MediasService) {}

  /** PUT /api/v1/moi/avatar (multipart/form-data : fichier). */
  @Put()
  @Exige('contribuer')
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @UseInterceptors(ReceptionImage)
  definir(@SessionCourante() session: SessionOuverte, @Req() requete: Request): Promise<AvatarApi> {
    return this.medias.definirAvatar(session.utilisateur.id, fichierRecu(requete));
  }

  @Delete()
  @Exige('parametres')
  retirer(@SessionCourante() session: SessionOuverte): Promise<AvatarApi> {
    return this.medias.retirerAvatar(session.utilisateur.id);
  }
}

/* Fichiers servis tels quels : clés aléatoires, contenu immuable (une image modifiée reçoit une
   nouvelle clé), donc mis en cache sans limite. Pas de limite de débit : une page en affiche
   des dizaines. Aucune session n'est lue pour ces adresses (AuthModule). */
@Controller('fichiers')
@SkipThrottle()
export class FichiersController {
  constructor(private readonly stockage: Stockage) {}

  /** GET /api/v1/fichiers/:cle */
  @Get(':cle')
  async lire(
    @Param('cle') cle: string,
    @Res({ passthrough: true }) reponse: Response,
  ): Promise<StreamableFile> {
    const fichier = await this.stockage.ouvrir(cle);
    if (!fichier) throw introuvable('Cette image est introuvable.');
    reponse.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(fichier.flux, {
      type: 'image/webp',
      length: fichier.taille,
      disposition: 'inline',
    });
  }
}
