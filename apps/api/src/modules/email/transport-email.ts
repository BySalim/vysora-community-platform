import { Inject, Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import type { EmailAEnvoyer } from './email.service.js';

/* Remise d'un e-mail au serveur SMTP ; en développement, Mailpit les capture. Appelé par la file
   (tâche « emails.envoyer ») : une exception fait reprendre l'envoi plus tard. Les tests remplacent
   ce transport par un double qui garde les messages en mémoire. */
@Injectable()
export class TransportEmail {
  private readonly transport: Transporter;
  private readonly expediteur: string;

  constructor(@Inject(CONFIG) config: Configuration) {
    this.transport = nodemailer.createTransport({
      url: config.SMTP_URL,
      // Un serveur qui ne répond pas libère la tâche bien avant sa durée maximale (2 minutes).
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
    this.expediteur = config.EMAIL_EXPEDITEUR;
  }

  async envoyer(email: EmailAEnvoyer): Promise<void> {
    await this.transport.sendMail({
      from: this.expediteur,
      to: email.a,
      subject: email.sujet,
      text: email.texte,
      html: email.html,
      replyTo: email.repondreA,
    });
  }
}
