import { Body, Controller, Get, HttpCode, Patch, Post, Put, Query } from '@nestjs/common';
import {
  schemaLectureNotifications,
  schemaPreferencesNotifications,
  type LectureNotifications,
  type LectureNotificationsApi,
  type NotificationsApi,
  type PreferencesNotifications,
  type PreferencesNotificationsApi,
} from '@vysora/shared';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { Exige, SessionCourante } from '../auth/droits.js';
import type { SessionOuverte } from '../auth/requete.js';
import { NotificationsService } from './notifications.service.js';

/* Notifications du membre connecté (F-81, EC-16). Un compte en lecture seule (e-mail à confirmer,
   conditions à accepter, suspension) les lit et les gère comme ses paramètres. */
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** GET /api/v1/notifications?avant=<curseur> */
  @Get('notifications')
  @Exige('parametres')
  lister(
    @SessionCourante() session: SessionOuverte,
    @Query('avant') avant?: string,
  ): Promise<NotificationsApi> {
    return this.notifications.lister(session.utilisateur.id, avant);
  }

  /** PATCH /api/v1/notifications : marquer lues ou non lues (une notification, ou une annulation). */
  @Patch('notifications')
  @Exige('parametres')
  marquer(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaLectureNotifications)) lecture: LectureNotifications,
  ): Promise<LectureNotificationsApi> {
    return this.notifications.marquer(session.utilisateur.id, lecture.ids, lecture.lue);
  }

  /** POST /api/v1/notifications/lecture : « Tout marquer comme lu ». */
  @Post('notifications/lecture')
  @HttpCode(200)
  @Exige('parametres')
  toutLire(@SessionCourante() session: SessionOuverte): Promise<LectureNotificationsApi> {
    return this.notifications.toutLire(session.utilisateur.id);
  }

  /** PUT /api/v1/moi/preferences-notifications : réponses à ses sujets et réponses acceptées par e-mail. */
  @Put('moi/preferences-notifications')
  @Exige('parametres')
  preferences(
    @SessionCourante() session: SessionOuverte,
    @Body(new ValidationZod(schemaPreferencesNotifications)) saisie: PreferencesNotifications,
  ): Promise<PreferencesNotificationsApi> {
    return this.notifications.modifierPreferences(session.utilisateur.id, saisie.email);
  }
}
