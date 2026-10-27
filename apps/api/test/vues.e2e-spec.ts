import { eq } from 'drizzle-orm';
import request from 'supertest';
import { contenu, vueContenu } from '../src/db/schema/index.js';
import { TACHES_PLANIFIEES } from '../src/modules/taches/taches-planifiees.js';
import { VuesService } from '../src/modules/interactions/vues.service.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const NAVIGATEUR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0';

describe('Vues (INT-04, F-23)', () => {
  let contexte: ApplicationDeTest;
  const serveur = () => contexte.app.getHttpServer();
  let auteurId: number;

  const vues = async (id: number) =>
    (await contexte.db.select({ n: contenu.nbVues }).from(contenu).where(eq(contenu.id, id)))[0]?.n;

  const voir = (id: number, ip: string, userAgent = NAVIGATEUR, agent = request(serveur())) =>
    agent
      .post(`/api/v1/contenus/${id}/vues`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .set('User-Agent', userAgent)
      .expect(204);

  async function agentConnecte(email: string, ip: string) {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
    auteurId = (await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' })).id;
    await creerMembre(contexte);
  });

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu');
    await contexte.app.close();
  });

  it('compte une vue par visiteur et par jour, sans garder l’adresse IP', async () => {
    const id = await creerCreation(contexte, auteurId);
    const ip = ipDeTest();
    await voir(id, ip);
    await voir(id, ip);
    expect(await vues(id)).toBe(1);
    // Un autre appareil derrière la même adresse est un autre visiteur.
    await voir(id, ip, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1');
    await voir(id, ipDeTest());
    expect(await vues(id)).toBe(3);

    const empreintes = await contexte.db.select().from(vueContenu);
    expect(empreintes).toHaveLength(3);
    for (const ligne of empreintes) {
      expect(ligne.empreinteVisiteur).toMatch(/^[0-9a-f]{64}$/);
      expect(ligne.empreinteVisiteur).not.toContain(ip);
    }
  });

  it('compte un membre une fois par jour, quelle que soit son adresse, et pas l’auteur', async () => {
    const id = await creerCreation(contexte, auteurId);
    const lecteur = await agentConnecte('awa.sarr@example.com', ipDeTest());
    await voir(id, ipDeTest(), NAVIGATEUR, lecteur);
    await voir(id, ipDeTest(), NAVIGATEUR, lecteur);
    expect(await vues(id)).toBe(1);

    const auteur = await agentConnecte('lea@example.com', ipDeTest());
    await voir(id, ipDeTest(), NAVIGATEUR, auteur);
    expect(await vues(id)).toBe(1);
  });

  it('ne compte ni un brouillon, ni un contenu masqué, ni un robot (RG-30)', async () => {
    const brouillon = await creerCreation(contexte, auteurId, { publiee: false });
    const masquee = await creerCreation(contexte, auteurId, { statut: 'MASQUE' });
    const publiee = await creerCreation(contexte, auteurId);
    await voir(brouillon, ipDeTest());
    await voir(masquee, ipDeTest());
    await voir(publiee, ipDeTest(), 'Mozilla/5.0 (compatible; Googlebot/2.1)');
    // Même réponse pour un contenu qui n'existe pas : rien n'est révélé.
    await voir(publiee + 1000, ipDeTest());
    expect([await vues(brouillon), await vues(masquee), await vues(publiee)]).toEqual([0, 0, 0]);
    expect(await contexte.db.$count(vueContenu)).toBe(0);
  });

  it('compte de nouveau le lendemain et efface les empreintes de plus de 2 jours', async () => {
    const id = await creerCreation(contexte, auteurId);
    const service = contexte.app.get(VuesService);
    const visiteur = { membreId: null, ip: ipDeTest(), userAgent: NAVIGATEUR };
    const jour = (n: number) => new Date(Date.now() - n * 24 * 3600_000);
    await service.compter(id, visiteur, jour(3));
    await service.compter(id, visiteur, jour(1));
    await service.compter(id, visiteur, jour(0));
    await service.compter(id, visiteur, jour(0));
    expect(await vues(id)).toBe(3);

    await contexte.taches.lancer(TACHES_PLANIFIEES.appliquerConservation);
    const restants = await contexte.db.select({ jour: vueContenu.jour }).from(vueContenu);
    expect(restants.map((ligne) => ligne.jour).toSorted()).toEqual([
      jour(1).toISOString().slice(0, 10),
      jour(0).toISOString().slice(0, 10),
    ]);
    // Le compteur reste.
    expect(await vues(id)).toBe(3);
  });
});
