import { randomInt } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SUITE_CONTACT, type MessageContact, type MessageContactEnvoye } from '@vysora/shared';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { estViolationUnicite } from '../../commun/erreurs.js';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { messageContact } from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';

const LIBELLE_MOTIF: Record<MessageContact['motif'], string> = {
  QUESTION: 'Question ou suggestion',
  DONNEES: 'Données personnelles',
  SIGNALEMENT: 'Signalement d’un contenu illicite',
  CONTESTATION: 'Contestation d’une décision',
  AUTRE: 'Autre demande',
};

/** Référence communiquée à l'expéditeur : VYS-AAAA-NNNNN (format du prototype). */
export const genererReference = (maintenant = new Date()): string =>
  `VYS-${maintenant.getUTCFullYear()}-${randomInt(10_000, 100_000)}`;

/* Messages envoyés à l'équipe depuis la page Contact, avec ou sans compte : enregistrés,
   transmis à l'équipe, puis confirmés à l'expéditeur par un accusé de réception. */
@Injectable()
export class ContactService {
  private readonly journal = new Logger(ContactService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly emails: EmailService,
  ) {}

  async envoyer(message: MessageContact, contexte: { ip?: string }): Promise<MessageContactEnvoye> {
    // Champ piège rempli : un robot. On répond comme d'habitude, sans rien enregistrer ni envoyer.
    if (message.siteWeb) return { reference: genererReference() };

    const reference = await this.enregistrer(message, contexte.ip);
    await this.prevenir(message, reference);
    return { reference };
  }

  private async enregistrer(message: MessageContact, ip?: string): Promise<string> {
    for (let essai = 0; essai < 5; essai += 1) {
      const reference = genererReference();
      try {
        await this.db.insert(messageContact).values({
          reference,
          motif: message.motif,
          nom: message.nom,
          email: message.email,
          contenu: message.contenu ?? null,
          message: message.message,
          bonneFoi: message.bonneFoi === true,
          empreinteIp: ip ? empreinteSalee(this.config.SEL_EMPREINTES, ip) : null,
        });
        return reference;
      } catch (erreur) {
        if (!estViolationUnicite(erreur, 'message_contact_reference_unique')) throw erreur;
      }
    }
    throw new Error('Impossible d’attribuer une référence unique au message de contact');
  }

  /** Les e-mails partent par la file, repris en cas d'échec (EMAIL-01). Une mise en file impossible
      n'annule pas le message, déjà enregistré : elle est journalisée. */
  private async prevenir(message: MessageContact, reference: string): Promise<void> {
    const motif = LIBELLE_MOTIF[message.motif];
    const equipe = miseEnForme({
      titre: `${motif} · ${reference}`,
      paragraphes: [message.message],
      details: [
        ['De', `${message.nom} <${message.email}>`],
        ['Objet', motif],
        ...(message.contenu ? ([['Contenu', message.contenu]] as [string, string][]) : []),
        ...(message.motif === 'SIGNALEMENT'
          ? ([['Bonne foi', 'Déclarée']] as [string, string][])
          : []),
      ],
    });
    const accuse = miseEnForme({
      titre: 'Nous avons bien reçu votre message',
      paragraphes: [
        `Bonjour ${message.nom},`,
        `Votre message est enregistré sous la référence ${reference}. ${SUITE_CONTACT[message.motif]}`,
        'Pour compléter votre demande, répondez simplement à cet e-mail en rappelant cette référence.',
      ],
    });

    const envois = await Promise.allSettled([
      this.emails.envoyer({
        a: this.config.EMAIL_EQUIPE,
        sujet: `[Contact] ${motif} · ${reference}`,
        repondreA: message.email,
        ...equipe,
      }),
      this.emails.envoyer({
        a: message.email,
        sujet: `Votre message à Vysora · ${reference}`,
        repondreA: this.config.EMAIL_EQUIPE,
        ...accuse,
      }),
    ]);
    for (const envoi of envois) {
      if (envoi.status === 'rejected')
        this.journal.warn(`E-mail de contact ${reference} non envoyé : ${String(envoi.reason)}`);
    }
  }
}
