import { eq } from 'drizzle-orm';
import request from 'supertest';
import { CONFIG } from '../src/config/configuration.module.js';
import type { Configuration } from '../src/config/env.js';
import { badge, invitation, obtentionBadge } from '../src/db/schema/index.js';
import { InvitationsService } from '../src/modules/auth/invitations.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

describe('Bêta fermée sur invitation (INV-01)', () => {
  let contexte: ApplicationDeTest;
  let config: Configuration;
  const serveur = () => contexte.app.getHttpServer();
  const inscrire = (corps: object) =>
    request(serveur())
      .post('/api/v1/comptes')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({
        email: 'kofi.mensah@example.com',
        motDePasse: MOT_DE_PASSE,
        accepteConditions: true,
        ...corps,
      });

  beforeAll(async () => {
    contexte = await demarrerApplication();
    config = contexte.app.get<Configuration>(CONFIG);
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'invitation');
    config.INSCRIPTION_SUR_INVITATION = true;
  });
  afterAll(async () => {
    config.INSCRIPTION_SUR_INVITATION = false;
    await vider(contexte.db, 'utilisateur', 'invitation');
    await contexte.app.close();
  });

  it('annonce que l’inscription se fait sur invitation', async () => {
    const reponse = await request(serveur()).get('/api/v1/inscription').expect(200);
    expect(reponse.body).toEqual({ surInvitation: true });
  });

  it('exige un code valable, le consomme et donne le badge Pionnier', async () => {
    const claire = await creerMembre(contexte, { pseudo: 'claire-dubois', email: 'c@example.com' });
    const [code] = await contexte.app.get(InvitationsService).creer(1, claire.id);

    const lien = await request(serveur()).get(`/api/v1/invitations/${code!.toLowerCase()}`);
    expect(lien.body).toEqual({ valable: true, par: { nom: 'claire-dubois', avatar: null } });

    const sansCode = await inscrire({}).expect(400);
    expect(sansCode.body.erreurs).toEqual({ codeInvitation: 'Saisissez votre code d’invitation.' });
    const faux = await inscrire({ codeInvitation: 'VYS-AAAA-AA' }).expect(400);
    expect(faux.body.erreurs.codeInvitation).toMatch(/n’est pas valable/);

    const reponse = await inscrire({ codeInvitation: code!.toLowerCase() }).expect(201);
    const [utilise] = await contexte.db.select().from(invitation).where(eq(invitation.code, code!));
    expect(utilise?.utilisateurId).toBe(reponse.body.membre.id);
    const badges = await contexte.db
      .select({ code: badge.code })
      .from(obtentionBadge)
      .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
      .where(eq(obtentionBadge.utilisateurId, reponse.body.membre.id));
    expect(badges).toEqual([{ code: 'PIONNIER' }]);

    // Un code ne sert qu'une fois.
    const encore = await inscrire({ email: 'awa@example.com', codeInvitation: code }).expect(400);
    expect(encore.body.erreurs.codeInvitation).toMatch(/n’est pas valable/);
    expect((await request(serveur()).get(`/api/v1/invitations/${code}`)).body.valable).toBe(false);
  });

  it('refuse un code expiré', async () => {
    const [code] = await contexte.app
      .get(InvitationsService)
      .creer(1, null, new Date(Date.now() - 1000));
    await inscrire({ codeInvitation: code }).expect(400);
  });

  it('laisse l’inscription ouverte hors de la bêta fermée', async () => {
    config.INSCRIPTION_SUR_INVITATION = false;
    await inscrire({}).expect(201);
  });
});
