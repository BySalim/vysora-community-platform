import type { PipeTransform } from '@nestjs/common';
import { introuvable } from '../erreurs.js';

/** Identifiant numérique dans l'adresse : @Param('id', IdentifiantPipe). Toute autre valeur ne désigne rien (404). */
export class IdentifiantPipe implements PipeTransform<string, number> {
  transform(valeur: string): number {
    const id = /^[1-9]\d{0,15}$/.test(valeur) ? Number(valeur) : Number.NaN;
    if (!Number.isSafeInteger(id)) throw introuvable();
    return id;
  }
}
