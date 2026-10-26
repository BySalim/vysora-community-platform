import { Global, Module } from '@nestjs/common';
import { FileTachesPgBoss } from './file-pg-boss.js';
import { FileTaches } from './file-taches.js';

/** File des tâches différées (EMAIL-01) : les modules injectent `FileTaches` pour déclarer et
    publier leurs tâches ; les tests la remplacent par `FileTachesImmediate`. */
@Global()
@Module({
  providers: [{ provide: FileTaches, useClass: FileTachesPgBoss }],
  exports: [FileTaches],
})
export class FileModule {}
