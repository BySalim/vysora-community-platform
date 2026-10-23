import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  schemaMessageContact,
  type MessageContact,
  type MessageContactEnvoye,
} from '@vysora/shared';
import type { Request } from 'express';
import { ValidationZod } from '../../commun/http/validation-zod.pipe.js';
import { ContactService } from './contact.service.js';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** POST /api/v1/contact : ouvert sans compte, limité à 5 messages par quart d'heure et par adresse IP. */
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  envoyer(
    @Body(new ValidationZod(schemaMessageContact)) message: MessageContact,
    @Req() requete: Request,
  ): Promise<MessageContactEnvoye> {
    return this.contact.envoyer(message, { ip: requete.ip });
  }
}
