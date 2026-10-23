import type { PipeTransform } from '@nestjs/common';
import { erreursParChamp } from '@vysora/shared';
import type { z } from 'zod';
import { erreurValidation } from '../erreurs.js';

/** Valide et normalise une entrée avec un schéma de @vysora/shared : @Body(new ValidationZod(schema)). */
export class ValidationZod<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(valeur: unknown): z.output<S> {
    const resultat = this.schema.safeParse(valeur);
    if (!resultat.success) throw erreurValidation(erreursParChamp(resultat.error));
    return resultat.data;
  }
}
