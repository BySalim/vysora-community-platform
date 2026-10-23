import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  acceptationDocument,
  documentLegal,
  jeton,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
import { dateDuJour } from '../src/modules/auth/documents-legaux.service.js';
import type { EmailAEnvoyer } from '../src/modules/email/email.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

/** Paramètre du lien contenu dans un e-mail (…/inscription?verifier=…, …/connexion?jeton=…). */
function lienDe(email: EmailAEnvoyer | undefined, parametre: 'verifier' | 'jeton'): string {
  const adresse = email?.texte.match(/https?:\/\/\S+/)?.[0];
  const valeur = adresse ? new URL(adresse).searchParams.get(parametre) : null;
  if (!valeur) throw new Error(`Aucun lien « ${parametre} » dans l’e-mail`);
  return valeur;
}

describe('Liens envoyés par e-mail et documents légaux', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const envoyer = (
    methode: 'post' | 'put' | 'patch',
    chemin: string,
    corps: object,
    agent: ReturnType<typeof request.agent> | ReturnType<typeof request> = request(serveur()),
  ) => agent[methode](chemin).set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip).send(corps);

  async function inscrireAgent(email = 'awa.sarr@example.com') {
    const agent = request.agent(serveur());
    await envoyer(
      'post',
      '/api/v1/comptes',
      { email, motDePasse: MOT_DE_PASSE, accepteConditions: true },
      agent,
    ).expect(201);
    return agent;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'tentative_connexion');
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'tentative_connexion');
    await contexte.app.close();
  });

  describe('vérification de l’adresse (AUTH-02, RG-02)', () => {
    it('envoie le lien à l’inscription ; le lien confirme l’adresse et sort le compte de la lecture seule', async () => {
      const agent = await inscrireAgent();
      expect(contexte.emails).toHaveLength(1);
      const [email] = contexte.emails;
      expect(email).toMatchObject({
        a: 'awa.sarr@example.com',
        sujet: 'Confirmez votre adresse e-mail',
      });
      expect(email?.html).toContain('Confirmer mon adresse');
      const valeur = lienDe(email, 'verifier');
      expect(email?.texte).toContain(`http://localhost:4321/inscription?verifier=${valeur}`);

      await envoyer('post', '/api/v1/comptes/verification', { jeton: valeur }).expect(204);
      const [compte] = await contexte.db.select().from(utilisateur);
      expect(compte?.emailVerifie).toBe(true);
      expect((await agent.get('/api/v1/session').expect(200)).body.etat.compte).toBe('actif');

      // Ouvert une seconde fois, le lien confirme encore.
      await envoyer('post', '/api/v1/comptes/verification', { jeton: valeur }).expect(204);
    });

    it('refuse un lien expiré ou inconnu, et en renvoie un nouveau depuis le lien expiré', async () => {
      await inscrireAgent();
      const ancien = lienDe(contexte.emails[0], 'verifier');
      await contexte.db.update(jeton).set({ dateExpiration: new Date(Date.now() - 1000) });

      const expire = await envoyer('post', '/api/v1/comptes/verification', {
        jeton: ancien,
      }).expect(410);
      expect(expire.body).toMatchObject({
        code: 'LIEN_EXPIRE',
        title: 'Ce lien n’est plus valable.',
      });
      await envoyer('post', '/api/v1/comptes/verification', { jeton: 'inconnu' }).expect(410);

      const renvoi = await envoyer('post', '/api/v1/comptes/verification/renvoi', {
        jeton: ancien,
      }).expect(200);
      expect(renvoi.body).toEqual({ email: 'awa.sarr@example.com' });
      expect(contexte.emails).toHaveLength(2);
      const nouveau = lienDe(contexte.emails[1], 'verifier');
      expect(nouveau).not.toBe(ancien);
      await envoyer('post', '/api/v1/comptes/verification', { jeton: nouveau }).expect(204);
    });

    it('renvoie le lien au membre connecté, sauf si son adresse est déjà confirmée', async () => {
      const agent = await inscrireAgent();
      await envoyer('post', '/api/v1/comptes/verification/renvoi', {}, agent).expect(200);
      expect(contexte.emails.map((e) => e.a)).toEqual([
        'awa.sarr@example.com',
        'awa.sarr@example.com',
      ]);
      // Le lien précédent ne fonctionne plus.
      await envoyer('post', '/api/v1/comptes/verification', {
        jeton: lienDe(contexte.emails[0], 'verifier'),
      }).expect(410);

      await envoyer('post', '/api/v1/comptes/verification', {
        jeton: lienDe(contexte.emails[1], 'verifier'),
      }).expect(204);
      const deja = await envoyer('post', '/api/v1/comptes/verification/renvoi', {}, agent).expect(
        409,
      );
      expect(deja.body.detail).toBe('Votre adresse e-mail est déjà confirmée.');

      const anonyme = await envoyer('post', '/api/v1/comptes/verification/renvoi', {}).expect(401);
      expect(anonyme.body.raison).toBe('connexion');
    });

    it('corrige l’adresse avant la vérification et envoie le lien à la nouvelle', async () => {
      await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' });
      const agent = await inscrireAgent('awa.sar@exemple.com');
      const ancien = lienDe(contexte.emails[0], 'verifier');

      const pris = await envoyer(
        'patch',
        '/api/v1/moi',
        { email: 'Kofi@example.com' },
        agent,
      ).expect(409);
      expect(pris.body.erreurs).toEqual({
        email: 'Cette adresse est déjà associée à un compte Vysora.',
      });

      await envoyer('patch', '/api/v1/moi', { email: 'awa.sarr@example.com' }, agent).expect(200);
      expect(contexte.emails.at(-1)?.a).toBe('awa.sarr@example.com');
      await envoyer('post', '/api/v1/comptes/verification', { jeton: ancien }).expect(410);
      await envoyer('post', '/api/v1/comptes/verification', {
        jeton: lienDe(contexte.emails.at(-1), 'verifier'),
      }).expect(204);

      const verifiee = await envoyer(
        'patch',
        '/api/v1/moi',
        { email: 'awa@example.com' },
        agent,
      ).expect(409);
      expect(verifiee.body.detail).toContain('depuis vos paramètres');
    });
  });

  describe('mot de passe oublié (AUTH-03, F-03)', () => {
    it('répond de la même façon que l’adresse possède un compte ou non', async () => {
      await creerMembre(contexte);
      const connue = await envoyer('post', '/api/v1/mot-de-passe/oubli', {
        email: 'Awa.Sarr@example.com',
      }).expect(202);
      const inconnue = await envoyer('post', '/api/v1/mot-de-passe/oubli', {
        email: 'personne@example.com',
      }).expect(202);
      expect(connue.body).toEqual(inconnue.body);

      expect(contexte.emails).toHaveLength(1);
      expect(contexte.emails[0]).toMatchObject({
        a: 'awa.sarr@example.com',
        sujet: 'Choisissez un nouveau mot de passe',
      });
      expect(contexte.emails[0]?.texte).toMatch(/http:\/\/localhost:4321\/connexion\?jeton=/);
    });

    it('n’envoie rien à un compte banni', async () => {
      await creerMembre(contexte, { statutCompte: 'BANNI' });
      await envoyer('post', '/api/v1/mot-de-passe/oubli', { email: 'awa.sarr@example.com' }).expect(
        202,
      );
      expect(contexte.emails).toHaveLength(0);
    });

    it('change le mot de passe, ferme toutes les sessions et lève la temporisation', async () => {
      await creerMembre(contexte, { emailVerifie: false });
      const agent = request.agent(serveur());
      await envoyer(
        'post',
        '/api/v1/session',
        { email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE },
        agent,
      ).expect(200);
      for (let i = 0; i < 4; i += 1)
        await envoyer('post', '/api/v1/session', {
          email: 'awa.sarr@example.com',
          motDePasse: 'pas le bon mot',
        }).expect(401);
      await envoyer('post', '/api/v1/session', {
        email: 'awa.sarr@example.com',
        motDePasse: 'pas le bon mot',
      }).expect(429);

      await envoyer('post', '/api/v1/mot-de-passe/oubli', { email: 'awa.sarr@example.com' }).expect(
        202,
      );
      const valeur = lienDe(contexte.emails[0], 'jeton');
      const lien = await envoyer('post', '/api/v1/mot-de-passe/lien', { jeton: valeur }).expect(
        200,
      );
      expect(lien.body).toEqual({ email: 'awa.sarr@example.com' });

      const nouveau = 'meridien cobalt sahel';
      await envoyer('put', '/api/v1/mot-de-passe', { jeton: valeur, motDePasse: nouveau }).expect(
        204,
      );
      expect(await contexte.db.select().from(session)).toHaveLength(0);
      expect((await agent.get('/api/v1/session').expect(200)).body.etat.session).toBe('visiteur');
      const [compte] = await contexte.db.select().from(utilisateur);
      expect(compte?.emailVerifie).toBe(true);

      // Lien à usage unique ; ancien mot de passe refusé, nouveau accepté sans attendre.
      await envoyer('put', '/api/v1/mot-de-passe', { jeton: valeur, motDePasse: nouveau }).expect(
        410,
      );
      await envoyer('post', '/api/v1/session', {
        email: 'awa.sarr@example.com',
        motDePasse: nouveau,
      }).expect(200);
      await envoyer('post', '/api/v1/session', {
        email: 'awa.sarr@example.com',
        motDePasse: MOT_DE_PASSE,
      }).expect(401);
    });

    it('applique la politique de mot de passe et refuse un lien expiré', async () => {
      await creerMembre(contexte);
      await envoyer('post', '/api/v1/mot-de-passe/oubli', { email: 'awa.sarr@example.com' }).expect(
        202,
      );
      const valeur = lienDe(contexte.emails[0], 'jeton');

      const personnel = await envoyer('put', '/api/v1/mot-de-passe', {
        jeton: valeur,
        motDePasse: 'awa.sarr-nouveau',
      }).expect(400);
      expect(personnel.body.erreurs).toEqual({
        motDePasse: 'Évitez votre pseudo ou votre adresse e-mail dans le mot de passe.',
      });

      await contexte.db.update(jeton).set({ dateExpiration: new Date(Date.now() - 1000) });
      await envoyer('post', '/api/v1/mot-de-passe/lien', { jeton: valeur }).expect(410);
      await envoyer('put', '/api/v1/mot-de-passe', {
        jeton: valeur,
        motDePasse: 'meridien cobalt sahel',
      }).expect(410);
    });
  });

  describe('documents légaux (F-04)', () => {
    it('donne la version en vigueur de chaque document', async () => {
      const reponse = await request(serveur()).get('/api/v1/documents-legaux').expect(200);
      expect(reponse.body.map((d: { type: string }) => d.type).toSorted()).toEqual([
        'CGU',
        'CHARTE',
        'CONFIDENTIALITE',
      ]);
      expect(reponse.body).toContainEqual(
        expect.objectContaining({
          type: 'CONFIDENTIALITE',
          acceptationRequise: false,
          url: '/confidentialite',
        }),
      );
    });

    it('fait accepter une nouvelle version : le compte sort de la lecture seule (RG-03, RG-112)', async () => {
      await creerMembre(contexte);
      const [nouvelle] = await contexte.db
        .insert(documentLegal)
        .values({
          type: 'CHARTE',
          version: 'test-acceptation',
          dateEffet: dateDuJour(),
          url: '/charte-communautaire',
          resumeChangements: 'Nouvelle règle de citation.',
        })
        .returning();
      try {
        const agent = request.agent(serveur());
        await envoyer(
          'post',
          '/api/v1/session',
          { email: 'awa.sarr@example.com', motDePasse: MOT_DE_PASSE },
          agent,
        ).expect(200);
        expect((await agent.get('/api/v1/session')).body.etat.compte).toBe('conditions');
        const aAccepter = async (requeteur: { get: (chemin: string) => request.Test }) =>
          Object.fromEntries(
            (await requeteur.get('/api/v1/documents-legaux').expect(200)).body.map(
              (d: { type: string; aAccepter: boolean }) => [d.type, d.aAccepter],
            ),
          );
        expect(await aAccepter(agent)).toEqual({
          CGU: false,
          CHARTE: true,
          CONFIDENTIALITE: false,
        });
        expect(Object.values(await aAccepter(request(serveur())))).not.toContain(true);

        const sansCase = await envoyer('post', '/api/v1/moi/acceptations', {}, agent).expect(400);
        expect(sansCase.body.erreurs).toEqual({
          accepte: 'Cochez la case pour accepter les nouvelles versions.',
        });
        const reponse = await envoyer(
          'post',
          '/api/v1/moi/acceptations',
          { accepte: true },
          agent,
        ).expect(200);
        expect(reponse.body.etat.compte).toBe('actif');
        expect(reponse.body.conditionsDepuis).toBeNull();
        expect(Object.values(await aAccepter(agent))).not.toContain(true);

        await envoyer('post', '/api/v1/moi/acceptations', { accepte: true }).expect(401);
      } finally {
        await contexte.db
          .delete(acceptationDocument)
          .where(eq(acceptationDocument.documentLegalId, nouvelle?.id ?? 0));
        await contexte.db.delete(documentLegal).where(eq(documentLegal.id, nouvelle?.id ?? 0));
      }
    });
  });
});
