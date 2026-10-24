import { Global, Module } from '@nestjs/common';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { AvatarController, FichiersController, MediasController } from './medias.controller.js';
import { MediasService } from './medias.service.js';
import { Stockage } from './stockage.js';
import { StockageDisque } from './stockage-disque.js';

/** Stockage des fichiers, utilisé aussi par les modules qui présentent des images (session, contenus). */
@Global()
@Module({
  providers: [
    {
      provide: Stockage,
      inject: [CONFIG],
      useFactory: (config: Configuration) => new StockageDisque(config.STOCKAGE_DOSSIER),
    },
  ],
  exports: [Stockage],
})
export class StockageModule {}

/* Médias (MEDIA-01) : téléversement, description, photo de profil, lecture des fichiers, nettoyage. */
@Module({
  imports: [StockageModule],
  controllers: [MediasController, AvatarController, FichiersController],
  providers: [MediasService],
  exports: [MediasService],
})
export class MediasModule {}
