import { Module } from '@nestjs/common';
import { DefisController } from './defis.controller.js';
import { DefisService } from './defis.service.js';

/* Défis (S-07, F-63 à F-65) : défi en cours, participations et défis clôturés. La création, la
   publication et la clôture par l'administration (EC-24) viendront avec ADM-02. */
@Module({
  controllers: [DefisController],
  providers: [DefisService],
})
export class DefisModule {}
