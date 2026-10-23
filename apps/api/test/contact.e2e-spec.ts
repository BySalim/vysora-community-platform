import { eq } from 'drizzle-orm';
import request from 'supertest';
import { messageContact } from '../src/db/schema/index.js';
import { ORIGINE_SITE, demarrerApplication, vider, type ApplicationDeTest } from './outils.js';

const valide = {
  motif: 'QUESTION',
  nom: 'Awa Sarr',
  email: 'awa.sarr@example.com',
  message: 'Comment déclarer une reproduction partielle sur une création ?',
};

describe('POST /api/v1/contact', () => {
  let contexte: ApplicationDeTest;
  const envoyer = (corps: object, origine = ORIGINE_SITE) =>
    request(contexte.app.getHttpServer())
      .post('/api/v1/contact')
      .set('Origin', origine)
      .send(corps);

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    contexte.emails.length = 0;
    await vider(contexte.db, 'message_contact');
  });

  afterAll(async () => {
    await contexte.app.close();
  });

  it('enregistre le message, prévient l’équipe et envoie un accusé de réception', async () => {
    const reponse = await envoyer(valide).expect(201);
    expect(reponse.body.reference).toMatch(/^VYS-\d{4}-\d{5}$/);

    const [enregistre] = await contexte.db
      .select()
      .from(messageContact)
      .where(eq(messageContact.reference, reponse.body.reference));
    expect(enregistre).toMatchObject({ motif: 'QUESTION', nom: 'Awa Sarr', statut: 'NOUVEAU' });
    expect(enregistre?.empreinteIp).toMatch(/^[0-9a-f]{64}$/);

    expect(contexte.emails.map((e) => e.a).toSorted()).toEqual([
      'awa.sarr@example.com',
      'equipe@vysora.local',
    ]);
    const accuse = contexte.emails.find((e) => e.a === 'awa.sarr@example.com');
    expect(accuse?.texte).toContain(reponse.body.reference);
  });

  it('refuse une saisie invalide et signale chaque champ', async () => {
    const reponse = await envoyer({
      motif: 'SIGNALEMENT',
      nom: '',
      email: 'awa@',
      message: 'trop court',
    }).expect(400);
    expect(reponse.headers['content-type']).toContain('application/problem+json');
    expect(reponse.body).toMatchObject({
      code: 'VALIDATION',
      erreurs: {
        nom: 'Indiquez votre nom.',
        email: 'Cette adresse e-mail est incomplète. Vérifiez-la.',
        message: 'Précisez votre message : 20 caractères au moins.',
      },
    });
    expect(await contexte.db.select().from(messageContact)).toHaveLength(0);
  });

  it('ignore sans le dire un envoi de robot (champ piège rempli)', async () => {
    await envoyer({ ...valide, siteWeb: 'https://spam.example' }).expect(201);
    expect(await contexte.db.select().from(messageContact)).toHaveLength(0);
    expect(contexte.emails).toHaveLength(0);
  });

  it('refuse une requête venue d’une autre origine (CSRF)', async () => {
    const reponse = await envoyer(valide, 'https://site-malveillant.example').expect(403);
    expect(reponse.body.code).toBe('ORIGINE_REFUSEE');
  });
});

describe('POST /api/v1/contact, limite d’envoi', () => {
  it('limite à 5 messages par quart d’heure pour une même adresse IP', async () => {
    const contexte = await demarrerApplication();
    try {
      const serveur = contexte.app.getHttpServer();
      for (let i = 0; i < 5; i += 1) {
        await request(serveur)
          .post('/api/v1/contact')
          .set('Origin', ORIGINE_SITE)
          .send(valide)
          .expect(201);
      }
      const reponse = await request(serveur)
        .post('/api/v1/contact')
        .set('Origin', ORIGINE_SITE)
        .send(valide)
        .expect(429);
      expect(reponse.body.code).toBe('TROP_DE_REQUETES');
    } finally {
      await vider(contexte.db, 'message_contact');
      await contexte.app.close();
    }
  });
});
