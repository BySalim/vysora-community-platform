import type {
  JournalAuditApi,
  ListeMembresAdministresApi,
  MembreAdministreApi,
  SessionApi,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { acceptationDocument, jeton, journalAudit, utilisateur } from '../src/db/schema/index.js';
import { EquipeService } from '../src/modules/administration/equipe.service.js';
import type { EmailAEnvoyer } from '../src/modules/email/email.service.js';
import {
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;

/** Jeton du lien …/connexion?jeton=… contenu dans un e-mail. */
function jetonDe(email: EmailAEnvoyer | undefined): string {
  const adresse = email?.texte.match(/https?:\/\/\S+/)?.[0];
  const valeur = adresse ? new URL(adresse).searchParams.get('jeton') : null;
  if (!valeur) throw new Error('Aucun lien d’activation dans l’e-mail');
  return valeur;
}

const NOUVEAU_MOT_DE_PASSE = 'meridien cobalt sahel';

describe('Comptes de l’équipe (ADM-03)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  const anonyme = (methode: 'post' | 'put', chemin: string, corps: object) =>
    request(serveur())
      [methode](chemin)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send(corps);

  async function agentConnecte(email: string, motDePasse = MOT_DE_PASSE): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse })
      .expect(200);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  async function claire(): Promise<Agent> {
    const agent = await agentConnecte('claire@example.com');
    await confirmerIdentite(contexte, 'claire@example.com');
    return agent;
  }
  const compte = async (email: string) =>
    (await contexte.db.select().from(utilisateur).where(eq(utilisateur.email, email)))[0];

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    ip = ipDeTest();
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'journal_audit', 'tentative_connexion');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      nomAffiche: 'Claire Dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'journal_audit', 'tentative_connexion');
    await contexte.app.close();
  });

  it('est réservé aux administrateurs dont l’identité est confirmée', async () => {
    const saisie = { email: 'kine@exemple.sn', nom: 'Kiné Lame', role: 'MODERATEUR' };
    await anonyme('post', '/api/v1/admin/equipe', saisie).expect(401);
    await creerMembre(contexte, {
      pseudo: 'thomas',
      email: 'thomas@example.com',
      role: 'MODERATEUR',
    });
    const thomas = await agentConnecte('thomas@example.com');
    await confirmerIdentite(contexte, 'thomas@example.com');
    await thomas.post('/api/v1/admin/equipe').send(saisie).expect(403);
    const nonVerifiee = await agentConnecte('claire@example.com');
    await nonVerifiee.post('/api/v1/admin/equipe').send(saisie).expect(403);
    expect(contexte.emails).toHaveLength(0);
  });

  it('crée le compte sans mot de passe et envoie le lien d’activation, puis la personne l’active', async () => {
    const agent = await claire();
    const ajout = await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'Kine.Lame@exemple.sn', nom: '  Kiné  Lame ', role: 'ADMINISTRATEUR' })
      .expect(201);
    const membre = ajout.body as MembreAdministreApi;
    expect(membre).toMatchObject({
      membre: { pseudo: 'kine-lame', nom: 'Kiné Lame' },
      role: 'ADMINISTRATEUR',
      deuxFacteurs: 'absente',
      activationEnAttente: true,
    });
    const cree = await compte('Kine.Lame@exemple.sn');
    expect(cree).toMatchObject({
      empreinteMotDePasse: null,
      emailVerifie: false,
      statutCompte: 'ACTIF',
    });

    // L'e-mail part à l'adresse saisie ; le lien n'est gardé qu'en empreinte, valable 7 jours.
    expect(contexte.emails).toHaveLength(1);
    const [email] = contexte.emails;
    expect(email).toMatchObject({
      a: 'Kine.Lame@exemple.sn',
      sujet: 'Activez votre compte Vysora',
    });
    expect(email?.texte).toContain('compte d’administration');
    expect(email?.texte).toContain('vérification en deux étapes');
    const valeur = jetonDe(email);
    const [ligne] = await contexte.db.select().from(jeton).where(eq(jeton.utilisateurId, cree!.id));
    expect(ligne).toMatchObject({ type: 'ACTIVATION_COMPTE' });
    expect(ligne?.empreinte).not.toBe(valeur);
    const jours = ((ligne?.dateExpiration.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(6.9);
    expect(jours).toBeLessThanOrEqual(7);

    // Un administrateur qui attend son activation ne compte pas encore (RG-111).
    const liste = (await agent.get('/api/v1/admin/membres').expect(200))
      .body as ListeMembresAdministresApi;
    expect(liste.administrateursActifs).toBe(1);
    expect(liste.elements.map((m) => [m.membre.pseudo, m.activationEnAttente])).toEqual([
      ['claire-dubois', false],
      ['kine-lame', true],
    ]);
    await agent
      .put(`/api/v1/admin/membres/${(await compte('claire@example.com'))!.id}/role`)
      .send({ role: 'MEMBRE' })
      .expect(409);

    // Pas de connexion possible avant l'activation.
    await anonyme('post', '/api/v1/session', {
      email: 'kine.lame@exemple.sn',
      motDePasse: NOUVEAU_MOT_DE_PASSE,
    }).expect(401);

    // L'écran du lien dit qu'il s'agit d'une activation.
    const lien = await anonyme('post', '/api/v1/mot-de-passe/lien', { jeton: valeur }).expect(200);
    expect(lien.body).toEqual({ email: 'Kine.Lame@exemple.sn', activation: true });
    await anonyme('put', '/api/v1/mot-de-passe', {
      jeton: valeur,
      motDePasse: NOUVEAU_MOT_DE_PASSE,
    }).expect(204);

    const active = await compte('Kine.Lame@exemple.sn');
    expect(active?.emailVerifie).toBe(true);
    expect(active?.empreinteMotDePasse).not.toBeNull();
    expect(active?.dateMotDePasse).toBeNull();
    // RG-03 : documents en vigueur acceptés à l'activation, comme à l'inscription.
    expect(
      await contexte.db.$count(
        acceptationDocument,
        eq(acceptationDocument.utilisateurId, active!.id),
      ),
    ).toBeGreaterThan(0);
    // Le lien ne sert qu'une fois.
    const reutilise = await anonyme('post', '/api/v1/mot-de-passe/lien', { jeton: valeur }).expect(
      410,
    );
    expect(reutilise.body).toMatchObject({ code: 'LIEN_EXPIRE', activation: true });

    // Première connexion : compte actif, et la vérification en deux étapes est à configurer (SEC-02).
    const kine = await agentConnecte('kine.lame@exemple.sn', NOUVEAU_MOT_DE_PASSE);
    const session = (await kine.get('/api/v1/session').expect(200)).body as SessionApi;
    expect(session.etat).toMatchObject({ compte: 'actif', role: 'membre' });
    expect(session.deuxFacteurs).toEqual({ etape: 'configurer', role: 'admin' });
    await kine.get('/api/v1/admin/membres').expect(403);
    await confirmerIdentite(contexte, 'Kine.Lame@exemple.sn');
    await kine.get('/api/v1/admin/membres').expect(200);

    const journal = (await agent.get('/api/v1/admin/journal?domaine=equipe').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.map((e) => [e.action, e.acteur?.pseudo, e.details])).toEqual([
      ['MEMBRE_EQUIPE_AJOUTE', 'claire-dubois', { role: 'ADMINISTRATEUR' }],
    ]);
  });

  it('refuse une adresse déjà inscrite, et renvoie le lien à un compte pas encore activé', async () => {
    const agent = await claire();
    await creerMembre(contexte);
    const prise = await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'AWA.SARR@example.com', nom: 'Awa Sarr', role: 'MODERATEUR' })
      .expect(409);
    expect(prise.body.erreurs.email).toMatch(/déjà associée à un compte/);

    await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'koffi@exemple.sn', nom: 'Koffi', role: 'ADMINISTRATEUR' })
      .expect(201);
    const premier = jetonDe(contexte.emails[0]);
    // Même adresse : le rôle et le nom sont mis à jour, un nouveau lien remplace le premier.
    const renvoi = await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'koffi@exemple.sn', nom: 'Koffi Gamisso', role: 'MODERATEUR' })
      .expect(200);
    expect(renvoi.body).toMatchObject({
      membre: { pseudo: 'koffi', nom: 'Koffi Gamisso' },
      role: 'MODERATEUR',
      activationEnAttente: true,
    });
    expect(contexte.emails[1]?.texte).toContain('compte de modération');
    await anonyme('post', '/api/v1/mot-de-passe/lien', { jeton: premier }).expect(410);
    const second = jetonDe(contexte.emails[1]);

    // Depuis la liste.
    const id = (await compte('koffi@exemple.sn'))!.id;
    await agent.post(`/api/v1/admin/membres/${id}/activation`).expect(204);
    expect(contexte.emails).toHaveLength(3);
    await anonyme('post', '/api/v1/mot-de-passe/lien', { jeton: second }).expect(410);

    // « Mot de passe oublié » d'un compte jamais activé : un nouveau lien d'activation.
    await anonyme('post', '/api/v1/mot-de-passe/oubli', { email: 'koffi@exemple.sn' }).expect(202);
    expect(contexte.emails).toHaveLength(4);
    expect(contexte.emails[3]?.sujet).toBe('Activez votre compte Vysora');
    await anonyme('put', '/api/v1/mot-de-passe', {
      jeton: jetonDe(contexte.emails[3]),
      motDePasse: NOUVEAU_MOT_DE_PASSE,
    }).expect(204);

    // Activé : plus de lien à renvoyer, l'adresse est désormais celle d'un compte.
    const refus = await agent.post(`/api/v1/admin/membres/${id}/activation`).expect(409);
    expect(refus.body.detail).toMatch(/déjà activé/);
    await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'koffi@exemple.sn', nom: 'Koffi Gamisso', role: 'MODERATEUR' })
      .expect(409);
    const actions = await contexte.db
      .select({ action: journalAudit.action })
      .from(journalAudit)
      .orderBy(journalAudit.id);
    expect(actions.map((a) => a.action)).toEqual([
      'MEMBRE_EQUIPE_AJOUTE',
      'ACTIVATION_RENVOYEE',
      'ACTIVATION_RENVOYEE',
    ]);
  });

  it('dit qu’un lien d’activation expiré en était un', async () => {
    const agent = await claire();
    await agent
      .post('/api/v1/admin/equipe')
      .send({ email: 'khaliq@exemple.sn', nom: 'Khaliq', role: 'ADMINISTRATEUR' })
      .expect(201);
    const valeur = jetonDe(contexte.emails[0]);
    await contexte.db.update(jeton).set({ dateExpiration: new Date(Date.now() - 1000) });
    const expire = await anonyme('post', '/api/v1/mot-de-passe/lien', { jeton: valeur }).expect(
      410,
    );
    expect(expire.body).toMatchObject({ code: 'LIEN_EXPIRE', activation: true });
    await anonyme('put', '/api/v1/mot-de-passe', {
      jeton: valeur,
      motDePasse: NOUVEAU_MOT_DE_PASSE,
    }).expect(410);
    // Le pseudo vient du nom, ici un prénom seul.
    expect((await compte('khaliq@exemple.sn'))?.pseudo).toBe('khaliq');
  });

  it('nomme un administrateur depuis le serveur (commande), sans auteur au journal', async () => {
    const equipe = contexte.app.get(EquipeService);
    const cree = await equipe.nommerAdministrateur('salim@exemple.sn', 'Salim Ouedraogo');
    expect(cree).toMatchObject({ pseudo: 'salim-ouedraogo', issue: 'cree' });
    expect(contexte.emails[0]).toMatchObject({
      a: 'salim@exemple.sn',
      sujet: 'Activez votre compte Vysora',
    });
    expect(await equipe.nommerAdministrateur('SALIM@exemple.sn', 'Salim Ouedraogo')).toMatchObject({
      issue: 'lien-renvoye',
    });

    // Un compte existant, actif et confirmé, est nommé ; une seconde fois, rien ne change.
    await creerMembre(contexte);
    expect(await equipe.nommerAdministrateur('awa.sarr@example.com', 'Awa Sarr')).toMatchObject({
      pseudo: 'awa-sarr',
      issue: 'promu',
    });
    expect((await compte('awa.sarr@example.com'))?.role).toBe('ADMINISTRATEUR');
    expect(await equipe.nommerAdministrateur('awa.sarr@example.com', 'Awa Sarr')).toMatchObject({
      issue: 'deja-administrateur',
    });
    // Une adresse pas encore confirmée ne l'est pas.
    await creerMembre(contexte, {
      pseudo: 'moussa',
      email: 'moussa@example.com',
      emailVerifie: false,
    });
    await expect(equipe.nommerAdministrateur('moussa@example.com', 'Moussa')).rejects.toThrow(
      /pas encore confirmé son adresse/,
    );

    const lignes = await contexte.db
      .select({
        action: journalAudit.action,
        acteurId: journalAudit.acteurId,
        details: journalAudit.details,
      })
      .from(journalAudit)
      .orderBy(journalAudit.id);
    expect(lignes).toEqual([
      {
        action: 'MEMBRE_EQUIPE_AJOUTE',
        acteurId: null,
        details: { role: 'ADMINISTRATEUR', origine: 'serveur' },
      },
      {
        action: 'ACTIVATION_RENVOYEE',
        acteurId: null,
        details: { role: 'ADMINISTRATEUR', origine: 'serveur' },
      },
      {
        action: 'ROLE_MODIFIE',
        acteurId: null,
        details: { avant: 'MEMBRE', apres: 'ADMINISTRATEUR', origine: 'serveur' },
      },
    ]);
  });
});
