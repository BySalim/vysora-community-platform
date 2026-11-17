import {
  applyDecorators,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { introuvable } from '../../commun/erreurs.js';
import { MEMOIRE_JEU, ParticipationsService } from './participations.service.js';

/** Politique du jeu d'un membre (S-17, ADR-0011) : document isolé (sandbox sans allow-same-origin,
    donc origine opaque : ni cookie, ni stockage, ni accès à la page), aucun accès au réseau, aucun
    formulaire, affichable seulement dans un cadre du site. */
export const CSP_JEU = [
  'sandbox allow-scripts allow-pointer-lock',
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'media-src data: blob:',
  'font-src data:',
  'worker-src blob:',
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

/** En-têtes communs au jeu publié et à la page d'essai. */
const EntetesJeu = () =>
  applyDecorators(
    Header('Content-Type', 'text/html; charset=utf-8'),
    Header('Content-Security-Policy', CSP_JEU),
    Header('X-Frame-Options', 'SAMEORIGIN'),
    Header('X-Content-Type-Options', 'nosniff'),
    Header('Referrer-Policy', 'no-referrer'),
    Header('Cross-Origin-Resource-Policy', 'same-origin'),
    Header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'),
    Header('Cache-Control', 'private, no-cache'),
  );

/** Page d'essai (S-17) : vide, elle attend le code du jeu que la page Défis lui envoie
    (postMessage, depuis la fenêtre parente seulement) et l'écrit dans son propre document, qui
    garde la politique ci-dessus. Le jeu s'essaie avant publication sans être enregistré. */
export const PAGE_ESSAI = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Essai du jeu</title><script>${MEMOIRE_JEU}(function(){var fait=false;window.addEventListener('message',function(e){if(fait||e.source!==window.parent||typeof e.data!=='string')return;fait=true;document.open();document.write(e.data);document.close();});window.parent.postMessage('vysora-essai-pret','*');})();</script></head><body></body></html>`;

@Controller('participations')
export class JeuxController {
  constructor(private readonly participations: ParticipationsService) {}

  /** GET /api/v1/participations/essai : la page d'essai, seulement dans un cadre. */
  @Get('essai')
  @EntetesJeu()
  essai(@Headers('sec-fetch-dest') destination?: string): string {
    if (destination && destination !== 'iframe')
      throw introuvable('L’essai d’un jeu se fait depuis le formulaire de participation.');
    return PAGE_ESSAI;
  }

  /** GET /api/v1/participations/:id/jeu : le jeu, seulement dans un cadre (Sec-Fetch-Dest) ; ouvert
      directement dans un onglet, il n'existe pas (pas de page de membre servie sur le domaine). */
  @Get(':id/jeu')
  @EntetesJeu()
  async jeu(
    @Param('id', ParseIntPipe) id: number,
    @Headers('sec-fetch-dest') destination?: string,
  ): Promise<string> {
    if (destination && destination !== 'iframe')
      throw introuvable('Ce jeu se joue depuis la page Défis.');
    const html = await this.participations.jeu(id);
    if (!html) throw introuvable('Ce jeu est introuvable.');
    return html;
  }
}
