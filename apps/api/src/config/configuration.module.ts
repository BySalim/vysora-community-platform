import { Global, Module } from '@nestjs/common';
import { lireConfiguration } from './env.js';

/** Jeton d'injection de la configuration validée : @Inject(CONFIG) config: Configuration. */
export const CONFIG = Symbol('CONFIG');

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: lireConfiguration }],
  exports: [CONFIG],
})
export class ConfigurationModule {}
