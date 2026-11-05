import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { CONFIG } from '../src/config/configuration.module.js';
import type { Configuration } from '../src/config/env.js';
import {
  acceptationDocument,
  compteExterne,
  invitation,
  session,
  utilisateur,
} from '../src/db/schema/index.js';
import { InvitationsService } from '../src/modules/auth/invitations.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  confirmerIdentite,
  cookieRecu,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

/* Connexion avec GitHub et Google (F-02, S-10) : aller-retour, inscription, connexion, aucune
   fusion automatique, liaison et déliaison depuis les paramètres. GitHub et Google sont simulés
   (FauxServicesExternes) ; le cookie de l'aller-retour et le `state` sont les vrais. */
describe('Connexion avec GitHub et Google (S-10)', () => {
  let contexte: ApplicationDeTest;
  let config: Configuration;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();

  const AWA = { identifiant: '1001', email: 'awa.sarr@example.com', nomCompte: 'awasarr' };

  /** Départ vers le service : redirection, `state` et cookie de l'aller-retour. */
  async function partir(
    service: 'github' | 'google',
    parametres: Record<string, string> = {},
    cookies: string[] = [],
  ) {
    const reponse = await request(serveur())
      .get(`/api/v1/auth/${service}`)
      .query(parametres)
      .set('X-Forwarded-For', ip)
      .set('Cookie', cookies)
      .expect(302);
    const location = String(reponse.headers.location);
    const cookie = cookieRecu(reponse.headers, 'vysora_oauth')?.split(';')[0];
    return {
      location,
      state: location.startsWith('https://') ? new URL(location).searchParams.get('state') : null,
      cookie,
      brut: cookieRecu(reponse.headers, 'vysora_oauth'),
    };
  }

  /** Retour du service avec un code ; renvoie l'adresse du site et le cookie de session posé. */
  async function revenir(
    service: 'github' | 'google',
    depart: { state: string | null; cookie?: string },
    code: string,
    cookies: string[] = [],
  ) {
    const reponse = await request(serveur())
      .get(`/api/v1/auth/${service}/retour`)
      .query({ code, state: depart.state ?? '' })
      .set('X-Forwarded-For', ip)
      .set('Cookie', [...(depart.cookie ? [depart.cookie] : []), ...cookies])
      .expect(302);
    return {
      adresse: String(reponse.headers.location),
      session: cookieRecu(reponse.headers)?.split(';')[0],
    };
  }

  const allerRetour = async (
    service: 'github' | 'google',
    code: string,
    parametres: Record<string, string> = {},
    cookies: string[] = [],
  ) => revenir(service, await partir(service, parametres, cookies), code, cookies);

  const sessionDe = async (cookie: string) =>
    (await request(serveur()).get('/api/v1/session').set('Cookie', cookie).expect(200)).body;

  async function connecterParMotDePasse(email: string): Promise<string> {
    const reponse = await request(serveur())
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return cookieRecu(reponse.headers)!.split(';')[0]!;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
    config = contexte.app.get<Configuration>(CONFIG);
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'invitation');
    contexte.services.profils.clear();
    contexte.services.ouvertes = ['github', 'google'];
    config.INSCRIPTION_SUR_INVITATION = false;
    ip = ipDeTest();
  });
  afterAll(async () => {
    config.INSCRIPTION_SUR_INVITATION = false;
    await vider(contexte.db, 'utilisateur', 'invitation');
    await contexte.app.close();
  });

  it('annonce les services configurés et ferme les autres', async () => {
    const tous = await request(serveur()).get('/api/v1/services-externes').expect(200);
    expect(tous.body).toEqual({ ouverts: ['github', 'google'] });

    contexte.services.ouvertes = ['github'];
    const depart = await partir('google', { intention: 'inscription' });
    expect(depart.location).toBe('/inscription?service=google&resultat=indisponible');
    expect(depart.cookie).toBeUndefined();
    await request(serveur()).get('/api/v1/auth/facebook').expect(404);
  });

  it('part avec un cookie d’aller-retour chiffré, limité aux routes du protocole', async () => {
    const depart = await partir('github', { intention: 'inscription', invitation: 'vys-k7m2-q9' });
    expect(depart.location).toMatch(/^https:\/\/github\.test\/autoriser\?state=/);
    expect(depart.state).toBeTruthy();
    expect(depart.brut).toMatch(/Path=\/api\/v1\/auth/);
    expect(depart.brut).toMatch(/HttpOnly/);
    expect(depart.brut).toMatch(/SameSite=Lax/);
    // Le contenu (secrets du protocole, code d'invitation) n'est pas lisible.
    expect(depart.cookie).not.toContain('VYS-K7M2-Q9');
    expect(depart.cookie).not.toContain(depart.state);
  });

  it('crée le compte à la première inscription : adresse vérifiée, sans mot de passe, documents acceptés', async () => {
    contexte.services.profils.set('code-awa', AWA);
    const { adresse, session: cookie } = await allerRetour('github', 'code-awa', {
      intention: 'inscription',
      retour: '/forum',
      pour: 'poser une question',
    });
    expect(adresse).toBe(
      '/inscription?service=github&etape=pseudo&retour=%2Fforum&pour=poser+une+question',
    );
    expect(cookie).toBeTruthy();

    const [cree] = await contexte.db
      .select()
      .from(utilisateur)
      .where(eq(utilisateur.email, AWA.email));
    expect(cree?.emailVerifie).toBe(true);
    expect(cree?.empreinteMotDePasse).toBeNull();
    const liens = await contexte.db
      .select()
      .from(compteExterne)
      .where(eq(compteExterne.utilisateurId, cree!.id));
    expect(liens).toMatchObject([
      { fournisseur: 'GITHUB', identifiantFournisseur: '1001', nomCompte: 'awasarr' },
    ]);
    const acceptations = await contexte.db
      .select()
      .from(acceptationDocument)
      .where(eq(acceptationDocument.utilisateurId, cree!.id));
    expect(acceptations.length).toBeGreaterThan(0);
    expect(contexte.emails).not.toContainEqual(expect.objectContaining({ a: AWA.email }));

    const etat = await sessionDe(cookie!);
    expect(etat.membre.pseudo).toBe(cree?.pseudo);
    expect(etat.etat.compte).toBe('actif');
  });

  it('connecte ensuite le membre, en fermant la session déjà ouverte sur l’appareil', async () => {
    contexte.services.profils.set('code-awa', AWA);
    const premiere = await allerRetour('github', 'code-awa', { intention: 'inscription' });

    contexte.services.profils.set('code-awa-2', { ...AWA, nomCompte: 'awa-sarr' });
    const { adresse, session: cookie } = await allerRetour(
      'github',
      'code-awa-2',
      { intention: 'connexion', retour: '/explorer' },
      [premiere.session!],
    );
    expect(adresse).toBe('/connexion?service=github&etape=connecte&retour=%2Fexplorer');
    expect(cookie).toBeTruthy();
    expect(cookie).not.toBe(premiere.session);
    expect((await sessionDe(premiere.session!)).etat.session).toBe('visiteur');
    expect((await sessionDe(cookie!)).etat.session).toBe('membre');

    // L'identifiant GitHub renommé suit dans les paramètres.
    const [lien] = await contexte.db.select().from(compteExterne);
    expect(lien?.nomCompte).toBe('awa-sarr');
  });

  it('ne fusionne jamais : une adresse déjà inscrite renvoie vers la connexion', async () => {
    await creerMembre(contexte, { email: AWA.email });
    contexte.services.profils.set('code-awa', AWA);

    const inscription = await allerRetour('google', 'code-awa', { intention: 'inscription' });
    expect(inscription.adresse).toBe('/inscription?service=google&resultat=email-pris');
    expect(inscription.session).toBeUndefined();

    const connexion = await allerRetour('google', 'code-awa', { intention: 'connexion' });
    expect(connexion.adresse).toBe('/connexion?service=google&resultat=email-pris');
    expect(await contexte.db.$count(compteExterne)).toBe(0);
  });

  it('propose de créer le compte quand aucun compte Vysora n’est lié', async () => {
    contexte.services.profils.set('code-awa', AWA);
    const { adresse, session: cookie } = await allerRetour('github', 'code-awa');
    expect(adresse).toBe('/connexion?service=github&resultat=inconnu');
    expect(cookie).toBeUndefined();
    expect(await contexte.db.$count(utilisateur)).toBe(0);
  });

  it('refuse une adresse que le service n’a pas vérifiée', async () => {
    contexte.services.profils.set('code-awa', { ...AWA, email: null });
    const { adresse } = await allerRetour('github', 'code-awa', { intention: 'inscription' });
    expect(adresse).toBe('/inscription?service=github&resultat=email-non-verifie');
    expect(await contexte.db.$count(utilisateur)).toBe(0);
  });

  it('exige et consomme un code d’invitation pendant la bêta (INV-01)', async () => {
    config.INSCRIPTION_SUR_INVITATION = true;
    contexte.services.profils.set('code-awa', AWA);
    const sansCode = await allerRetour('github', 'code-awa', { intention: 'inscription' });
    expect(sansCode.adresse).toBe('/inscription?service=github&resultat=invitation');

    const [code] = await contexte.app.get(InvitationsService).creer(1);
    const avecCode = await allerRetour('github', 'code-awa', {
      intention: 'inscription',
      invitation: code!.toLowerCase(),
    });
    expect(avecCode.adresse).toBe('/inscription?service=github&etape=pseudo');
    const [utilise] = await contexte.db.select().from(invitation).where(eq(invitation.code, code!));
    expect(utilise?.utilisateurId).not.toBeNull();

    // Un code ne sert qu'une fois.
    contexte.services.profils.set('code-kofi', {
      identifiant: '1002',
      email: 'kofi@example.com',
      nomCompte: 'kofi',
    });
    const encore = await allerRetour('github', 'code-kofi', {
      intention: 'inscription',
      invitation: code!,
    });
    expect(encore.adresse).toBe('/inscription?service=github&resultat=invitation');
  });

  it('refuse un retour sans le cookie du départ, avec un autre state ou après un refus', async () => {
    contexte.services.profils.set('code-awa', AWA);
    const depart = await partir('github', { intention: 'inscription' });

    const sansCookie = await revenir('github', { state: depart.state }, 'code-awa');
    expect(sansCookie.adresse).toBe('/connexion?service=github&resultat=indisponible');
    const autreState = await revenir('github', { ...depart, state: 'falsifie' }, 'code-awa');
    expect(autreState.adresse).toBe('/inscription?service=github&resultat=indisponible');
    const autreService = await revenir('google', depart, 'code-awa');
    expect(autreService.adresse).toBe('/connexion?service=google&resultat=indisponible');
    const codeInconnu = await revenir('github', depart, 'code-faux');
    expect(codeInconnu.adresse).toBe('/inscription?service=github&resultat=indisponible');

    const refus = await request(serveur())
      .get('/api/v1/auth/github/retour')
      .query({ error: 'access_denied', state: depart.state })
      .set('Cookie', depart.cookie!)
      .expect(302);
    expect(refus.headers.location).toBe('/inscription?service=github&resultat=indisponible');
    expect(await contexte.db.$count(utilisateur)).toBe(0);
  });

  it('n’accepte comme retour qu’une page du site', async () => {
    contexte.services.profils.set('code-awa', AWA);
    for (const retour of [
      'https://ailleurs.example',
      '//ailleurs.example',
      '/\\ailleurs',
      '/api/v1',
    ]) {
      const depart = await partir('github', { retour });
      expect(depart.location).toMatch(/^https:\/\/github\.test\//);
      const { adresse } = await revenir('github', depart, 'code-awa');
      expect(adresse).toBe('/connexion?service=github&resultat=inconnu');
    }
  });

  it('refuse un compte fermé par la modération', async () => {
    const membre = await creerMembre(contexte, { statutCompte: 'BANNI' });
    await contexte.db
      .insert(compteExterne)
      .values({ utilisateurId: membre.id, fournisseur: 'GITHUB', identifiantFournisseur: '1001' });
    contexte.services.profils.set('code-awa', AWA);
    const { adresse, session: cookie } = await allerRetour('github', 'code-awa');
    expect(adresse).toBe('/connexion?service=github&resultat=ferme');
    expect(cookie).toBeUndefined();
  });

  it('demande la double authentification aux comptes de l’équipe (ENF-05)', async () => {
    const moderatrice = await creerMembre(contexte, { role: 'MODERATEUR' });
    await contexte.db.insert(compteExterne).values({
      utilisateurId: moderatrice.id,
      fournisseur: 'GITHUB',
      identifiantFournisseur: '1001',
    });
    contexte.services.profils.set('code-awa', AWA);
    const { adresse, session: cookie } = await allerRetour('github', 'code-awa', {
      retour: '/moderation',
    });
    expect(adresse).toBe('/connexion?service=github&retour=%2Fmoderation');
    const etat = await sessionDe(cookie!);
    expect(etat.deuxFacteurs).toEqual({ etape: 'configurer', role: 'moderateur' });
    expect(etat.etat.role).toBe('membre');
  });

  it('annule la demande de suppression à la reconnexion (WF-23)', async () => {
    const membre = await creerMembre(contexte, { statutCompte: 'EN_SUPPRESSION' });
    await contexte.db
      .insert(compteExterne)
      .values({ utilisateurId: membre.id, fournisseur: 'GOOGLE', identifiantFournisseur: 'g-1' });
    contexte.services.profils.set('code-awa', { ...AWA, identifiant: 'g-1' });
    const { adresse } = await allerRetour('google', 'code-awa');
    expect(adresse).toMatch(
      /^\/connexion\?service=google&etape=connecte&suppression=\d{4}-\d{2}-\d{2}$/,
    );
    const [compte] = await contexte.db
      .select({ statut: utilisateur.statutCompte })
      .from(utilisateur)
      .where(eq(utilisateur.id, membre.id));
    expect(compte?.statut).toBe('ACTIF');
  });

  describe('depuis les paramètres', () => {
    const lier = async (cookie: string, code: string, service: 'github' | 'google' = 'github') =>
      (await allerRetour(service, code, { intention: 'liaison' }, [cookie])).adresse;
    const parametres = async (cookie: string) =>
      (await request(serveur()).get('/api/v1/moi/parametres').set('Cookie', cookie).expect(200))
        .body;
    const delier = (cookie: string, service: string) =>
      request(serveur())
        .delete(`/api/v1/moi/comptes-externes/${service}`)
        .set('Origin', ORIGINE_SITE)
        .set('Cookie', cookie);

    it('lie un service au compte connecté, puis la connexion passe par lui', async () => {
      await creerMembre(contexte);
      const cookie = await connecterParMotDePasse('awa.sarr@example.com');
      contexte.services.profils.set('code-gh', {
        identifiant: '77',
        email: 'autre-adresse@example.com',
        nomCompte: 'awa-code',
      });
      expect(await lier(cookie, 'code-gh')).toBe('/parametres?service=github&resultat=lie');

      const lus = await parametres(cookie);
      expect(lus.motDePasse).toBe(true);
      expect(lus.servicesOuverts).toEqual(['github', 'google']);
      expect(lus.comptesExternes).toEqual([
        { service: 'github', nom: 'awa-code', dateLiaison: expect.any(String) },
      ]);

      const connexion = await allerRetour('github', 'code-gh');
      expect(connexion.adresse).toBe('/connexion?service=github&etape=connecte');
    });

    it('demande une session, et l’identité confirmée pour l’équipe', async () => {
      const visiteur = await partir('github', { intention: 'liaison' });
      expect(visiteur.location).toBe('/connexion?retour=%2Fparametres');

      await creerMembre(contexte, { role: 'ADMINISTRATEUR' });
      const cookie = await connecterParMotDePasse('awa.sarr@example.com');
      expect((await partir('github', { intention: 'liaison' }, [cookie])).location).toBe(
        '/connexion?retour=%2Fparametres',
      );
      await confirmerIdentite(contexte, 'awa.sarr@example.com');
      expect((await partir('github', { intention: 'liaison' }, [cookie])).location).toMatch(
        /^https:\/\/github\.test\//,
      );
    });

    it('refuse un compte du service déjà lié ailleurs, ou un second compte du même service', async () => {
      const kofi = await creerMembre(contexte, { pseudo: 'kofi', email: 'kofi@example.com' });
      await contexte.db
        .insert(compteExterne)
        .values({ utilisateurId: kofi.id, fournisseur: 'GITHUB', identifiantFournisseur: '77' });
      await creerMembre(contexte);
      const cookie = await connecterParMotDePasse('awa.sarr@example.com');

      contexte.services.profils.set('code-kofi', {
        identifiant: '77',
        email: null,
        nomCompte: 'k',
      });
      expect(await lier(cookie, 'code-kofi')).toBe(
        '/parametres?service=github&resultat=lie-ailleurs',
      );
      contexte.services.profils.set('code-1', { identifiant: '88', email: null, nomCompte: 'a' });
      contexte.services.profils.set('code-2', { identifiant: '99', email: null, nomCompte: 'b' });
      expect(await lier(cookie, 'code-1')).toBe('/parametres?service=github&resultat=lie');
      expect(await lier(cookie, 'code-2')).toBe('/parametres?service=github&resultat=deja-lie');
    });

    it('délie un service, sauf s’il est le seul moyen de connexion', async () => {
      contexte.services.profils.set('code-awa', AWA);
      const { session: cookie } = await allerRetour('github', 'code-awa', {
        intention: 'inscription',
      });
      const refus = await delier(cookie!, 'github').expect(409);
      expect(refus.body.detail).toBe(
        'GitHub est votre seul moyen de connexion. Définissez d’abord un mot de passe pour pouvoir le délier.',
      );
      await delier(cookie!, 'google').expect(404);

      // Un second service lié suffit pour délier le premier.
      contexte.services.profils.set('code-g', { identifiant: 'g-5', email: null, nomCompte: 'g' });
      expect(await lier(cookie!, 'code-g', 'google')).toBe(
        '/parametres?service=google&resultat=lie',
      );
      const apres = await delier(cookie!, 'github').expect(200);
      expect(apres.body.comptesExternes.map((c: { service: string }) => c.service)).toEqual([
        'google',
      ]);
    });

    it('définit un mot de passe une seule fois, puis la connexion par e-mail fonctionne', async () => {
      contexte.services.profils.set('code-awa', AWA);
      const { session: cookie } = await allerRetour('github', 'code-awa', {
        intention: 'inscription',
      });
      const definir = (nouveau: string) =>
        request(serveur())
          .post('/api/v1/moi/mot-de-passe')
          .set('Origin', ORIGINE_SITE)
          .set('Cookie', cookie!)
          .send({ nouveau });
      const faible = await definir('awasarr').expect(400);
      expect(faible.body.erreurs.nouveau).toBeTruthy();

      const defini = await definir(MOT_DE_PASSE).expect(200);
      expect(defini.body.motDePasse).toBe(true);
      await definir('un autre mot de passe solide').expect(409);
      await connecterParMotDePasse(AWA.email);
      await delier(cookie!, 'github').expect(200);
    });

    it('change l’adresse d’un compte sans mot de passe par le seul lien de confirmation', async () => {
      contexte.services.profils.set('code-awa', AWA);
      const { session: cookie } = await allerRetour('github', 'code-awa', {
        intention: 'inscription',
      });
      await request(serveur())
        .post('/api/v1/moi/email')
        .set('Origin', ORIGINE_SITE)
        .set('Cookie', cookie!)
        .send({ email: 'awa.nouvelle@example.com' })
        .expect(200);
      expect(contexte.emails.map((email) => email.a)).toContain('awa.nouvelle@example.com');

      // Un compte avec mot de passe doit toujours le donner.
      await creerMembre(contexte, { pseudo: 'kofi', email: 'kofi@example.com' });
      const kofi = await connecterParMotDePasse('kofi@example.com');
      const refus = await request(serveur())
        .post('/api/v1/moi/email')
        .set('Origin', ORIGINE_SITE)
        .set('Cookie', kofi)
        .send({ email: 'kofi.nouveau@example.com' })
        .expect(400);
      expect(refus.body.erreurs.motDePasse).toBe('Saisissez votre mot de passe actuel.');
    });
  });

  it('ne garde aucune session ouverte pour un retour refusé', async () => {
    contexte.services.profils.set('code-awa', AWA);
    await allerRetour('github', 'code-faux', { intention: 'inscription' });
    expect(await contexte.db.$count(session)).toBe(0);
    expect(
      await contexte.db.$count(
        compteExterne,
        and(
          eq(compteExterne.fournisseur, 'GITHUB'),
          eq(compteExterne.identifiantFournisseur, '1001'),
        ),
      ),
    ).toBe(0);
  });
});
