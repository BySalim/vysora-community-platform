import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/* Notifications (NOTIF-01, F-81, RG-91) : les modules qui produisent un événement appellent
   NotificationsService dans leur transaction ; la page Notifications lit et marque. */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
