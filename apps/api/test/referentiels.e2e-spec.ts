import type { ReferentielsApi } from '@vysora/shared';
import request from 'supertest';
import { demarrerApplication, type ApplicationDeTest } from './outils.js';

describe('GET /api/v1/referentiels', () => {
  let contexte: ApplicationDeTest;
  let referentiels: ReferentielsApi;

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const reponse = await request(contexte.app.getHttpServer())
      .get('/api/v1/referentiels')
      .expect(200);
    expect(reponse.headers['cache-control']).toContain('public');
    referentiels = reponse.body as ReferentielsApi;
  });

  afterAll(async () => {
    await contexte.app.close();
  });

  it('renvoie le catalogue des 64 outils, en 6 familles, avec leurs modèles proposés', () => {
    expect(referentiels.outils).toHaveLength(64);
    expect(new Set(referentiels.outils.map((o) => o.famille)).size).toBe(6);
    const cursor = referentiels.outils.find((o) => o.nom === 'Cursor');
    expect(cursor).toMatchObject({
      editeur: 'Anysphere',
      estAgent: true,
      logo: 'cursor',
      logoMonochrome: true,
    });
    expect(cursor?.modeles.map((m) => m.nomCourt)).toEqual(['Sonnet 4.5', 'GPT-5']);
  });

  it('propose CC BY 4.0 comme seule licence par défaut (D-07)', () => {
    const parDefaut = referentiels.licences.filter((l) => l.estParDefaut);
    expect(parDefaut.map((l) => l.libelle)).toEqual(['CC BY 4.0']);
    expect(
      referentiels.licences.find((l) => l.code === 'TOUS-DROITS-RESERVES')?.autoriseVariantes,
    ).toBe(false);
  });

  it('renvoie les niveaux, les badges, les catégories et les types de vote', () => {
    expect(referentiels.niveaux.map((n) => [n.libelle, n.seuilPoints])).toEqual([
      ['Curieux', 0],
      ['Apprenti', 50],
      ['Artisan', 300],
      ['Expert', 1500],
      ['Maître', 5000],
    ]);
    expect(referentiels.badges).toHaveLength(13);
    expect(referentiels.categories).toHaveLength(10);
    expect(referentiels.typesVote.map((t) => t.code).toSorted()).toEqual(['TESTE_OK', 'UTILE']);
  });
});
