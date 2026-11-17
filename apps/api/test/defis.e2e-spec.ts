import type { ContenuCreationSaisi, CreationFicheApi, DefisApi } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { categorie, contenu, creation, defi, outil } from '../src/db/schema/index.js';
import {
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;
const JOUR = 86_400_000;
const PAGE_DEFIS = 'On participe à un défi depuis sa page, avec le formulaire de participation.';

describe('Défis (S-07, F-63 à F-65, RG-73 à RG-75 ; participations S-17)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  let awaId: number;
  let defiId: number;
  let outilId: number;
  let categorieId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const lire = async (agent: Agent | ReturnType<typeof request>) =>
    (await agent.get('/api/v1/defis').expect(200)).body as DefisApi;
  /** « 1 prompt » complet, publiable tel quel depuis l'éditeur. */
  const unPrompt = (valeurs: Partial<ContenuCreationSaisi> = {}): ContenuCreationSaisi => ({
    type: 'UN_PROMPT',
    titre: 'Affiche typographique de Gorée',
    objectif: 'Une affiche lisible, construite autour du nom du lieu.',
    categorieId,
    etapes: [
      {
        configurations: [{ outilId }],
        echanges: [
          {
            prompt: 'Affiche typographique de Gorée, bleu profond et blanc.',
            reponse: 'Voici une affiche verticale, le nom du lieu en grand.',
          },
        ],
      },
    ],
    ...valeurs,
  });
  const publier = (agent: Agent, id: number) =>
    agent.post(`/api/v1/creations/${id}/publication`).send({ confirmationDonnees: true });
  const periode = (debut: number, fin: number) =>
    contexte.db
      .update(defi)
      .set({
        dateDebut: new Date(Date.now() + debut * JOUR),
        dateFin: new Date(Date.now() + fin * JOUR),
      })
      .where(eq(defi.id, defiId));
  /** Une participation (S-17) : un jeu, ses prompts, son outil. */
  const JEU =
    '<!doctype html><html><head><title>Jeu</title></head><body><canvas></canvas><script>let x = 1;</script></body></html>';
  const saisie = (valeurs: Record<string, unknown> = {}) => ({
    titre: 'Hotfix Hero',
    idee: 'Un runner en pixel art où l’horloge sert de niveau.',
    outilId,
    modele: 'Sonnet 4.5',
    prompts: ['Écris un runner complet dans un seul fichier HTML.'],
    essais: 1,
    jeu: { nom: 'hotfix-hero.html', html: JEU },
    ...valeurs,
  });
  const participations = () => `/api/v1/defis/${defiId}/participations`;
  const publierParticipation = (agent: Agent, valeurs: Record<string, unknown> = {}) =>
    agent.post(participations()).send(saisie(valeurs));

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [o] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .limit(1);
    const [c] = await contexte.db
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.estActive, true))
      .limit(1);
    if (!o || !c) throw new Error('Référentiels absents');
    [outilId, categorieId] = [o.id, c.id];
  });
  beforeEach(async () => {
    ip = ipDeTest();
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    awaId = (await creerMembre(contexte)).id;
    await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' });
    const [cree] = await contexte.db
      .insert(defi)
      .values({
        organisateurId: awaId,
        titre: 'Une affiche touristique',
        slug: 'une-affiche-touristique',
        enonce: 'Créez l’affiche d’un lieu que vous aimez.',
        contraintes: '- Trois échanges au plus\n- Un lieu réel',
        dateDebut: new Date(Date.now() - 2 * JOUR),
        dateFin: new Date(Date.now() + 3 * JOUR),
        statut: 'PUBLIE',
      })
      .returning({ id: defi.id });
    defiId = cree!.id;
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'defi');
    await contexte.app.close();
  });

  it('présente le défi en cours, jamais un brouillon', async () => {
    const d = await lire(request(serveur()));
    expect(d.defi).toMatchObject({
      id: defiId,
      etat: 'EN_COURS',
      regles: ['Trois échanges au plus', 'Un lieu réel'],
      participations: 0,
    });
    expect(d.moi).toBeNull();
    await contexte.db.update(defi).set({ statut: 'BROUILLON' }).where(eq(defi.id, defiId));
    expect((await lire(request(serveur()))).defi).toBeNull();
  });

  it('publie une participation depuis la page Défis, une par personne, classée par votes (S-17, RG-75)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const lea = await agentConnecte('lea@example.com');
    const deAwa = ((await publierParticipation(awa).expect(201)).body as { id: number }).id;
    expect(
      (await publierParticipation(awa, { titre: 'Une autre idée' }).expect(409)).body.detail,
    ).toBe(
      'Vous participez déjà à ce défi avec « Hotfix Hero » : une participation par personne. Modifiez-la plutôt.',
    );
    const deLea = (
      (await publierParticipation(lea, { titre: 'L’ascenseur est en panne' }).expect(201)).body as {
        id: number;
      }
    ).id;
    // RG-40 : le vote « Utile » d'un membre sur la participation d'un autre.
    await awa.put(`/api/v1/contenus/${deLea}/votes/UTILE`).expect(200);
    const d = await lire(lea);
    expect(d.defi?.participations).toBe(2);
    expect(
      d.participations.map((p) => [
        p.creation.titre,
        p.nature,
        p.utiles,
        p.detail?.mienne,
        p.detail?.jeu,
      ]),
    ).toEqual([
      ['L’ascenseur est en panne', 'PARTICIPATION', 1, true, true],
      ['Hotfix Hero', 'PARTICIPATION', 0, false, true],
    ]);
    expect(d.participations[1]?.detail).toMatchObject({
      prompts: ['Écris un runner complet dans un seul fichier HTML.'],
      modele: 'Sonnet 4.5',
      jeuNom: 'hotfix-hero.html',
      outilId,
    });
    expect(d.moi).toEqual({
      participation: { id: deLea, titre: 'L’ascenseur est en panne', nature: 'PARTICIPATION' },
      eligibles: [],
    });

    // Modifier : son auteur seulement ; son code lui revient pour le formulaire.
    await awa
      .put(`${participations()}/${deAwa}`)
      .send(saisie({ titre: 'Hotfix Hero, version 2' }))
      .expect(204);
    await lea.put(`${participations()}/${deAwa}`).send(saisie()).expect(403);
    expect((await awa.get(`${participations()}/${deAwa}/jeu`).expect(200)).body).toEqual({
      jeu: { nom: 'hotfix-hero.html', html: JEU },
    });
    await lea.get(`${participations()}/${deAwa}/jeu`).expect(403);
    await request(serveur()).get(`${participations()}/${deAwa}/jeu`).expect(401);

    // En pause : ni publication ni modification ; la suppression reste possible.
    await contexte.db.update(defi).set({ pauseDepuis: new Date() }).where(eq(defi.id, defiId));
    await awa.put(`${participations()}/${deAwa}`).send(saisie()).expect(409);
    await awa.delete(`${participations()}/${deAwa}`).expect(204);
    expect((await publierParticipation(awa).expect(409)).body.detail).toMatch(/en pause/);
    await contexte.db.update(defi).set({ pauseDepuis: null }).where(eq(defi.id, defiId));
    expect((await lire(awa)).participations).toHaveLength(1);

    // Défi passé : fermé ; sans session : refusé.
    await periode(-10, -1);
    expect((await publierParticipation(awa).expect(409)).body.detail).toMatch(/fermées/);
    await request(serveur())
      .post(participations())
      .set('Origin', ORIGINE_SITE)
      .send(saisie())
      .expect(401);
  });

  it('contrôle le jeu à la publication et ne le sert que dans un cadre isolé (S-17, ADR-0011)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    const refus = await publierParticipation(awa, {
      jeu: { nom: 'jeu.html', html: '<body><form><input type="password"></form></body>' },
    }).expect(400);
    expect(refus.body.erreurs.jeu).toMatch(/mot de passe/);
    expect(
      (await publierParticipation(awa, { jeu: null, couvertureId: null }).expect(400)).body.erreurs,
    ).toEqual({ jeu: 'Ajoutez votre jeu (fichier HTML) ou une image.' });
    expect(
      (await publierParticipation(awa, { idee: 'Trop court' }).expect(400)).body.erreurs.idee,
    ).toMatch(/20 caractères/);
    const { id } = (await publierParticipation(awa).expect(201)).body as { id: number };

    const jeu = await request(serveur())
      .get(`/api/v1/participations/${id}/jeu`)
      .set('Sec-Fetch-Dest', 'iframe')
      .expect(200);
    expect(jeu.headers['content-type']).toMatch(/^text\/html/);
    expect(jeu.headers['content-security-policy']).toMatch(
      /^sandbox allow-scripts allow-pointer-lock;/,
    );
    expect(jeu.headers['content-security-policy']).toContain("connect-src 'none'");
    expect(jeu.headers['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(jeu.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(jeu.headers['referrer-policy']).toBe('no-referrer');
    // Stockage en mémoire placé avant le code du membre.
    expect(jeu.text.indexOf('localStorage')).toBeLessThan(jeu.text.indexOf('<title>'));
    expect(jeu.text).toContain('<canvas></canvas>');
    // Ouvert dans un onglet : il n'existe pas.
    await request(serveur())
      .get(`/api/v1/participations/${id}/jeu`)
      .set('Sec-Fetch-Dest', 'document')
      .expect(404);
    const essai = await request(serveur())
      .get('/api/v1/participations/essai')
      .set('Sec-Fetch-Dest', 'iframe')
      .expect(200);
    expect(essai.headers['content-security-policy']).toMatch(/^sandbox allow-scripts/);
    expect(essai.text).toContain('e.source!==window.parent');
    // Masquée par la modération : plus servie.
    await contexte.db.update(contenu).set({ statut: 'MASQUE' }).where(eq(contenu.id, id));
    await request(serveur())
      .get(`/api/v1/participations/${id}/jeu`)
      .set('Sec-Fetch-Dest', 'iframe')
      .expect(404);
    expect((await lire(awa)).participations).toEqual([]);
  });

  it('ne rattache plus une création à un défi ; une création inscrite avant reste listée et se retire (S-17)', async () => {
    const awa = await agentConnecte('awa.sarr@example.com');
    expect(
      (await awa.post('/api/v1/creations').send(unPrompt({ defiId })).expect(400)).body.erreurs,
    ).toEqual({ defiId: PAGE_DEFIS });
    expect(
      (await awa.put(`/api/v1/defis/${defiId}/participation`).send({ creationId: 1 }).expect(409))
        .body.detail,
    ).toBe(PAGE_DEFIS);

    // Création inscrite avant S-17 : listée, comptée comme la participation de son auteur.
    const { id } = (await awa.post('/api/v1/creations').send(unPrompt()).expect(201))
      .body as CreationFicheApi;
    await publier(awa, id).expect(200);
    await contexte.db.update(creation).set({ defiId }).where(eq(creation.id, id));
    const d = await lire(awa);
    expect(d.participations.map((p) => [p.creation.id, p.nature, p.detail])).toEqual([
      [id, 'CREATION', null],
    ]);
    expect(d.moi?.participation).toEqual({
      id,
      titre: 'Affiche typographique de Gorée',
      nature: 'CREATION',
    });
    expect((await publierParticipation(awa).expect(409)).body.detail).toMatch(
      /une création par personne/,
    );

    // Elle se retire depuis l'éditeur tant que le défi est en cours, sans pouvoir y revenir.
    const modifier = (valeurs: Partial<ContenuCreationSaisi>) =>
      awa.put(`/api/v1/creations/${id}`).send(unPrompt({ ...valeurs, confirmationDonnees: true }));
    expect(((await modifier({ defiId }).expect(200)).body as CreationFicheApi).defi?.id).toBe(
      defiId,
    );
    expect(
      ((await modifier({ defiId: null }).expect(200)).body as CreationFicheApi).defi,
    ).toBeNull();
    expect((await modifier({ defiId }).expect(400)).body.erreurs).toEqual({
      defiId: PAGE_DEFIS,
    });

    // Défi terminé : la participation est conservée.
    await contexte.db.update(creation).set({ defiId }).where(eq(creation.id, id));
    await periode(-10, -1);
    expect((await modifier({ defiId: null }).expect(400)).body.erreurs).toEqual({
      defiId: 'Le défi n’est plus en cours : la participation est conservée.',
    });
    expect(((await modifier({}).expect(200)).body as CreationFicheApi).defi).toMatchObject({
      id: defiId,
      etat: 'TERMINE',
      ouvert: false,
    });
  });
});
