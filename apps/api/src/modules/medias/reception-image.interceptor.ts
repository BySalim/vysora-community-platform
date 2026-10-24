import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { LIMITES } from '@vysora/shared';
import type { Request, Response } from 'express';
import multer from 'multer';
import type { Observable } from 'rxjs';
import { erreurValidation } from '../../commun/erreurs.js';
import { MESSAGES_REFUS_IMAGE } from './traitement-images.js';

/* Lecture d'un envoi multipart/form-data : une seule image dans le champ « fichier », gardée en
   mémoire (5 Mo au plus, RG-16), et quelques champs texte (description). Le corps n'est lu qu'après
   les gardes : un visiteur sans droit n'envoie rien qui soit traité. */

const lecteur = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: LIMITES.tailleImageOctets,
    files: 1,
    fields: 4,
    fieldSize: 2_000,
    parts: 5,
    headerPairs: 20,
  },
}).single('fichier');

/** Fichier lu par ReceptionImage, s'il y en a un. */
export const fichierRecu = (requete: Request): Buffer | undefined => requete.file?.buffer;

@Injectable()
export class ReceptionImage implements NestInterceptor {
  async intercept(contexte: ExecutionContext, suite: CallHandler): Promise<Observable<unknown>> {
    const http = contexte.switchToHttp();
    await new Promise<void>((resoudre, rejeter) => {
      lecteur(http.getRequest<Request>(), http.getResponse<Response>(), (erreur: unknown) => {
        if (erreur) rejeter(convertir(erreur));
        else resoudre();
      });
    });
    return suite.handle();
  }
}

function convertir(erreur: unknown) {
  if (erreur instanceof multer.MulterError) {
    if (erreur.code === 'LIMIT_FILE_SIZE')
      return erreurValidation({ fichier: MESSAGES_REFUS_IMAGE.taille });
    if (erreur.code === 'LIMIT_FILE_COUNT' || erreur.code === 'LIMIT_UNEXPECTED_FILE')
      return erreurValidation({ fichier: 'Ajoutez une image à la fois.' });
  }
  // Envoi interrompu ou mal formé.
  return erreurValidation({ fichier: 'L’envoi de l’image n’a pas abouti. Réessayez.' });
}
