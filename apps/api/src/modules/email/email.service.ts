import { Inject, Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';

export interface EmailAEnvoyer {
  a: string;
  sujet: string;
  texte: string;
  html?: string;
  repondreA?: string;
}

/* Envoi des e-mails transactionnels (F-80) par SMTP ; en développement, Mailpit les capture.
   Les tests remplacent ce service par un double qui garde les messages en mémoire. */
@Injectable()
export class EmailService {
  private readonly transport: Transporter;
  private readonly expediteur: string;

  constructor(@Inject(CONFIG) config: Configuration) {
    this.transport = nodemailer.createTransport(config.SMTP_URL);
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
