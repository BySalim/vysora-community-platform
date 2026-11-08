import request from 'supertest';
import { CONFIG } from '../src/config/configuration.module.js';
import type { Configuration } from '../src/config/env.js';
import { EmailService } from '../src/modules/email/email.service.js';
import { ORIGINE_SITE, demarrerApplication, vider, type ApplicationDeTest } from './outils.js';

describe('E-mails vers un domaine réservé (DEMO-04)', () => {
  let contexte: ApplicationDeTest;
  let config: Configuration;
  const essai = (a: string) => ({ a, sujet: 'Essai', texte: 'Bonjour.' });
  const destinataires = () => contexte.emails.map((email) => email.a).toSorted();

  beforeAll(async () => {
    contexte = await demarrerApplication();
    config = contexte.app.get<Configuration>(CONFIG);
  });
  beforeEach(async () => {
    contexte.emails.length = 0;
    await vider(contexte.db, 'message_contact');
    config.NODE_ENV = 'production';
  });
  afterAll(async () => {
    config.NODE_ENV = 'test';
    await vider(contexte.db, 'message_contact');
    await contexte.app.close();
  });

  it('en production, le formulaire de contact prévient l’équipe sans écrire à une adresse réservée', async () => {
    await request(contexte.app.getHttpServer())
      .post('/api/v1/contact')
      .set('Origin', ORIGINE_SITE)
      .send({
        motif: 'QUESTION',
        nom: 'Clarisse Mendy',
        email: 'clarisse-mendy@example.test',
        message: 'Comment déclarer une reproduction partielle sur une création ?',
      })
      .expect(201);
    expect(destinataires()).toEqual(['equipe@vysora.local']);
  });

  it('en production, un envoi en nombre ne garde que les adresses réelles', async () => {
    const emails = contexte.app.get(EmailService);
    await emails.envoyerPlusieurs([
      essai('clarisse-mendy@example.test'),
      essai('fatou.ndiaye@exemple.sn'),
      essai('kofi@docs.example.org'),
    ]);
    await emails.envoyerPlusieurs([essai('moderation-demo@example.test')]);
    expect(destinataires()).toEqual(['fatou.ndiaye@exemple.sn']);
  });

  it('en développement et en test, tout part (Mailpit, tests)', async () => {
    const emails = contexte.app.get(EmailService);
    for (const environnement of ['development', 'test'] as const) {
      config.NODE_ENV = environnement;
      await emails.envoyer(essai('clarisse-mendy@example.test'));
    }
    expect(destinataires()).toEqual(['clarisse-mendy@example.test', 'clarisse-mendy@example.test']);
  });
});
