import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { chiffrer, dechiffrer } from '../../commun/securite/chiffrement.js';
import { FileTaches } from '../file/file-taches.js';
import { TransportEmail } from './transport-email.js';

export interface EmailAEnvoyer {
  a: string;
  sujet: string;
  texte: string;
  html?: string;
  repondreA?: string;
}

/** Tâche de la file qui remet un e-mail au serveur SMTP. */
export const TACHE_EMAIL = 'emails.envoyer';

/** E-mail tel qu'il attend dans la file : chiffré, car il porte des adresses, des messages et des
    liens à usage unique dont seule l'empreinte est en base (AUTH-02, AUTH-03). */
interface EmailEnFile {
  chiffre: string;
}

/* E-mails transactionnels (F-80, RG-90) et de notification (F-81). `envoyer` met l'e-mail dans la
   file et rend la main : il part après la réponse. Si le serveur SMTP échoue, l'envoi est repris
   avec un délai qui double à chaque fois (30 secondes à 1 minute avant la première reprise, sept
   essais sur une heure au plus) ; l'abandon est journalisé (EMAIL-01). L'appelant n'attend jamais
   le serveur SMTP. */
@Injectable()
export class EmailService implements OnModuleInit {
  constructor(
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly file: FileTaches,
    private readonly transport: TransportEmail,
  ) {}

  onModuleInit(): void {
    this.file.declarer<EmailEnFile>({
      nom: TACHE_EMAIL,
      executer: async ({ chiffre }) =>
        this.transport.envoyer(
          JSON.parse(dechiffrer(this.config.CLE_CHIFFREMENT, chiffre)) as EmailAEnvoyer,
        ),
      reprises: { nombre: 6, delaiSecondes: 30 },
      dureeMaximaleSecondes: 120,
      // Un e-mail envoyé n'a plus rien à faire en base ; un abandon reste un jour, pour comprendre.
      conservationSecondes: 24 * 3600,
      simultanees: 2,
    });
  }

  async envoyer(email: EmailAEnvoyer): Promise<void> {
    await this.file.publier(TACHE_EMAIL, this.enFile(email));
  }

  /** Envois en nombre (annonce d'un nouveau document légal) : insérés en une fois. */
  async envoyerPlusieurs(emails: EmailAEnvoyer[]): Promise<void> {
    await this.file.publierPlusieurs(
      TACHE_EMAIL,
      emails.map((email) => this.enFile(email)),
    );
  }

  private enFile(email: EmailAEnvoyer): EmailEnFile {
    return { chiffre: chiffrer(this.config.CLE_CHIFFREMENT, JSON.stringify(email)) };
  }
}
