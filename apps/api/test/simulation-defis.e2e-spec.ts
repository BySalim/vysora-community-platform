import type { AccueilApi, ContenuCreationSaisi, DefiAdministreApi, DefisApi } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { categorie, mouvementReputation, notification, outil } from '../src/db/schema/index.js';
import {
  MOT_DE_PASSE,
  ORIGINE_SITE,
  confirmerIdentite,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = ReturnType<typeof request.agent>;
const JOUR = 86_400_000;

/* Simulation d'un défi joué par des membres (S-17), uniquement par l'API, comme sur le site : le défi
   « Deploy Friday » de la démo est créé, publié, suivi, mis en pause, prolongé puis clôturé avant sa
   fin ; six membres participent depuis la page Défis (un jeu, ses prompts), votent, jouent, tentent
   ce qui leur est interdit. Chaque étape vérifie ce que la page publique, l'accueil et
   l'administration en montrent. */
describe('Simulation : un défi joué par des membres (S-17)', () => {
  let contexte: ApplicationDeTest;
  let ip: string;
  const serveur = () => contexte.app.getHttpServer();
  let outilId: number;
  let categorieId: number;

  async function connecter(email: string): Promise<Agent> {
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    return agent;
  }
  const appel = (
    agent: Agent,
    methode: 'get' | 'post' | 'put' | 'patch' | 'delete',
    adresse: string,
    corps?: object,
  ) =>
    agent[methode](`/api/v1${adresse}`)
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send(corps);
  const page = async (defiId?: number) =>
    (
      await request(serveur())
        .get(`/api/v1/defis${defiId ? `?defi=${defiId}` : ''}`)
        .expect(200)
    ).body as DefisApi;

  /** Une création « 1 prompt » de l'éditeur, qui ne peut plus être rattachée à un défi (S-17). */
  const creation = (titre: string, defiId: number | null): ContenuCreationSaisi => ({
    type: 'UN_PROMPT',
    titre,
    objectif: 'Un jeu jouable dans le navigateur, obtenu en un seul prompt.',
    categorieId,
    etiquettes: ['Jeu'],
    defiId,
    etapes: [
      {
        configurations: [{ outilId }],
        echanges: [
          {
            prompt: `Écris un jeu complet dans un seul fichier HTML : ${titre}, un runner en pixel art.`,
            reponse: 'Voici le fichier HTML du jeu, avec ses commandes au clavier et au toucher.',
          },
        ],
        moments: [],
      },
    ],
  });
  /** Une participation à un défi (S-17) : un jeu HTML, son prompt, son outil. */
  const jeu = (titre: string) => ({
    titre,
    idee: `${titre} : un runner en pixel art jouable au clavier et au toucher.`,
    outilId,
    modele: 'Sonnet 4.5',
    prompts: [`Écris un jeu complet dans un seul fichier HTML : ${titre}, un runner en pixel art.`],
    essais: 1,
    jeu: {
      nom: 'jeu.html',
      html: `<!doctype html><html><head><title>${titre}</title></head><body><canvas></canvas></body></html>`,
    },
  });
  /** Publier sa participation depuis la page Défis ; rend son identifiant. */
  async function participer(agent: Agent, defiId: number, titre: string): Promise<number> {
    return (
      (await appel(agent, 'post', `/defis/${defiId}/participations`, jeu(titre)).expect(201))
        .body as { id: number }
    ).id;
  }
  const voter = (agent: Agent, contenuId: number) =>
    appel(agent, 'put', `/contenus/${contenuId}/votes/UTILE`).expect((r) => {
      if (r.status >= 300) throw new Error(`Vote refusé : ${r.status} ${JSON.stringify(r.body)}`);
    });

  beforeAll(async () => {
    contexte = await demarrerApplication();
    const [o] = await contexte.db
      .select({ id: outil.id })
      .from(outil)
      .where(eq(outil.statut, 'ACTIF'))
      .orderBy(outil.id)
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
    await vider(
      contexte.db,
      'utilisateur',
      'contenu',
      'defi',
      'mouvement_reputation',
      'journal_audit',
    );
  });
  afterAll(async () => {
    await vider(
      contexte.db,
      'utilisateur',
      'contenu',
      'defi',
      'mouvement_reputation',
      'journal_audit',
    );
    await contexte.app.close();
  });

  it('Deploy Friday : publié, joué, mis en pause, prolongé et clôturé avant sa fin', async () => {
    // L'équipe et six membres.
    await creerMembre(contexte, {
      pseudo: 'sophie-laurent',
      email: 'sophie@example.com',
      role: 'ADMINISTRATEUR',
    });
    const membres = {
      awa: await creerMembre(contexte, { pseudo: 'awa-sarr', email: 'awa@example.com' }),
      kofi: await creerMembre(contexte, { pseudo: 'kofi-mensah', email: 'kofi@example.com' }),
      moussa: await creerMembre(contexte, { pseudo: 'moussa-diallo', email: 'moussa@example.com' }),
      lea: await creerMembre(contexte, { pseudo: 'lea-martin', email: 'lea@example.com' }),
      clarisse: await creerMembre(contexte, {
        pseudo: 'clarisse-mendy',
        email: 'clarisse@example.com',
      }),
      ibrahima: await creerMembre(contexte, {
        pseudo: 'ibrahima-sow',
        email: 'ibrahima@example.com',
      }),
    };
    const admin = await connecter('sophie@example.com');
    await confirmerIdentite(contexte, 'sophie@example.com');
    const awa = await connecter('awa@example.com');
    const kofi = await connecter('kofi@example.com');
    const moussa = await connecter('moussa@example.com');
    const lea = await connecter('lea@example.com');
    const clarisse = await connecter('clarisse@example.com');
    const ibrahima = await connecter('ibrahima@example.com');

    // 1. L'administration prépare trois défis : Deploy Friday (en cours depuis deux jours), le
    //    suivant (programmé) et un brouillon qu'elle supprime.
    const debut = new Date(Date.now() - 2 * JOUR);
    const fin = new Date(Date.now() + 5 * JOUR);
    const deployFriday = {
      titre: 'Deploy Friday',
      definition:
        '« Deploy Friday » : mettre un site en production le vendredi soir, juste avant le week-end.',
      enonce:
        'Faites-en un jeu de plateforme ou un runner, jouable dans le navigateur, en un seul prompt.',
      dateDebut: debut.toISOString(),
      dateFin: fin.toISOString(),
      cases: [
        { chiffre: '1', intitule: 'seul prompt', precision: 'Sans retouche du jeu obtenu' },
        { chiffre: '1', intitule: 'fichier HTML', precision: 'Jouable dans le navigateur' },
        { chiffre: '0', intitule: 'ressource en ligne', precision: 'Ni bibliothèque ni image' },
        { chiffre: '1', intitule: 'participation', precision: 'Par personne' },
      ],
      criteres: [
        { icone: 'user', libelle: 'Animation du personnage' },
        { icone: 'keyboard', libelle: 'Fluidité des contrôles' },
        { icone: 'smile', libelle: 'Humour' },
        { icone: 'trend-up', libelle: 'Progression du niveau' },
      ],
      criteresCommuns: [
        'Rendu visuel',
        'Sensations de jeu',
        'Rejouabilité',
        'Marche du premier coup',
      ],
    };
    const brouillon = (await appel(admin, 'post', '/admin/defis', deployFriday).expect(201))
      .body as DefiAdministreApi;
    expect(brouillon).toMatchObject({
      statut: 'BROUILLON',
      cases: deployFriday.cases,
      criteres: deployFriday.criteres,
    });
    // Un brouillon n'est jamais public, même par son adresse.
    expect((await page(brouillon.id)).defi?.id).not.toBe(brouillon.id);
    const df = (await appel(admin, 'post', `/admin/defis/${brouillon.id}/publication`).expect(200))
      .body as DefiAdministreApi;
    expect(df.actions).toEqual(['pause', 'cloturer', 'annuler']);
    const dans9 = new Date(Date.now() + 9 * JOUR);
    const suivant = (
      await appel(admin, 'post', '/admin/defis', {
        titre: 'Un jingle de dix secondes pour un podcast',
        enonce:
          'Composez le générique d’un podcast réel ou imaginaire : dix secondes, et une fin qui tombe juste.',
        dateDebut: dans9.toISOString(),
        dateFin: new Date(dans9.getTime() + 7 * JOUR).toISOString(),
        cases: [{ chiffre: '10', intitule: 'secondes au plus', precision: 'Fin comprise' }],
      }).expect(201)
    ).body as DefiAdministreApi;
    await appel(admin, 'post', `/admin/defis/${suivant.id}/publication`).expect(200);
    const menu = (
      await appel(admin, 'post', '/admin/defis', {
        titre: 'Un menu de restaurant en trois langues',
        enonce:
          'Traduisez le menu d’un restaurant de votre quartier, sans perdre une seule saveur.',
        dateDebut: dans9.toISOString(),
        dateFin: new Date(dans9.getTime() + 3 * JOUR).toISOString(),
      }).expect(201)
    ).body as DefiAdministreApi;
    await appel(admin, 'delete', `/admin/defis/${menu.id}`).expect(204);
    await appel(admin, 'delete', `/admin/defis/${df.id}`).expect(409);
    // Un membre n'administre rien.
    await appel(awa, 'get', '/admin/defis').expect(403);
    await appel(awa, 'post', `/admin/defis/${df.id}/pause`).expect(403);

    // 2. La page Défis et l'accueil montrent Deploy Friday, ses règles et ses principes.
    let p = await page();
    expect(p.defi).toMatchObject({
      id: df.id,
      etat: 'EN_COURS',
      enPause: false,
      definition: deployFriday.definition,
      cases: deployFriday.cases,
      criteresCommuns: deployFriday.criteresCommuns,
    });
    expect(p.defi?.regles).toEqual([
      '1 seul prompt',
      '1 fichier HTML',
      '0 ressource en ligne',
      '1 participation',
    ]);
    const accueil = (await request(serveur()).get('/api/v1/accueil').expect(200))
      .body as AccueilApi;
    expect(JSON.stringify(accueil)).toContain('Deploy Friday');

    // 3. Les membres participent depuis la page Défis : un jeu, ses prompts, son outil (S-17).
    const deAwa = await participer(awa, df.id, 'Hotfix Hero');
    const deKofi = await participer(kofi, df.id, 'L’ascenseur est en panne');
    const deMoussa = await participer(moussa, df.id, 'git push vendredi');
    const deLea = await participer(lea, df.id, 'Rollback Rush, le runner à rebours');
    // Une seule participation par personne : Awa ne peut pas en ajouter une deuxième.
    expect(
      (await appel(awa, 'post', `/defis/${df.id}/participations`, jeu('Hotfix Hero 2')).expect(409))
        .body.detail,
    ).toMatch(/une participation par personne/);
    // Ni la participation d'un autre, ni un jeu qui demande un mot de passe, ni un défi à venir,
    // ni une création de l'éditeur rattachée au défi.
    await appel(kofi, 'put', `/defis/${df.id}/participations/${deLea}`, jeu('Rollback')).expect(
      403,
    );
    await appel(kofi, 'delete', `/defis/${df.id}/participations/${deLea}`).expect(403);
    expect(
      (
        await appel(ibrahima, 'post', `/defis/${df.id}/participations`, {
          ...jeu('Connexion requise'),
          jeu: { nom: 'jeu.html', html: '<body><input type="password" name="mdp"></body>' },
        }).expect(400)
      ).body.erreurs.jeu,
    ).toMatch(/mot de passe/);
    await appel(ibrahima, 'post', `/defis/${suivant.id}/participations`, jeu('Le jingle')).expect(
      409,
    );
    expect(
      (
        await appel(ibrahima, 'post', '/creations', creation('Le jingle du lundi', df.id)).expect(
          400,
        )
      ).body.erreurs.defiId,
    ).toMatch(/depuis sa page/);
    // Le jeu se joue dans un cadre isolé, jamais ouvert comme une page du site.
    const cadre = await request(serveur())
      .get(`/api/v1/participations/${deAwa}/jeu`)
      .set('Sec-Fetch-Dest', 'iframe')
      .expect(200);
    expect(cadre.headers['content-security-policy']).toMatch(/^sandbox allow-scripts/);
    await request(serveur())
      .get(`/api/v1/participations/${deAwa}/jeu`)
      .set('Sec-Fetch-Dest', 'document')
      .expect(404);

    // 4. La communauté vote ; on ne vote pas pour soi.
    for (const votant of [kofi, moussa, lea]) await voter(votant, deAwa);
    for (const votant of [awa, lea]) await voter(votant, deKofi);
    await voter(awa, deMoussa);
    await appel(awa, 'put', `/contenus/${deAwa}/votes/UTILE`).expect((r) =>
      expect(r.status).toBeGreaterThanOrEqual(400),
    );
    p = await page(df.id);
    expect(p.participations.map((x) => [x.creation.titre, x.nature, x.utiles])).toEqual([
      ['Hotfix Hero', 'PARTICIPATION', 3],
      ['L’ascenseur est en panne', 'PARTICIPATION', 2],
      ['git push vendredi', 'PARTICIPATION', 1],
      ['Rollback Rush, le runner à rebours', 'PARTICIPATION', 0],
    ]);
    // Awa modifie la sienne : les votes reçus sont conservés.
    await appel(awa, 'put', `/defis/${df.id}/participations/${deAwa}`, {
      ...jeu('Hotfix Hero'),
      idee: 'Un runner en pixel art où l’horloge sert de niveau : chaque quart d’heure accélère.',
    }).expect(204);
    expect((await page(df.id)).participations[0]).toMatchObject({ utiles: 3 });

    // 5. Menace signalée : l'administration met le défi en pause.
    await appel(admin, 'post', `/admin/defis/${df.id}/pause`).expect(200);
    p = await page(df.id);
    expect(p.defi).toMatchObject({ etat: 'EN_COURS', enPause: true });
    expect(
      (
        await appel(
          clarisse,
          'post',
          `/defis/${df.id}/participations`,
          jeu('Le café de 18 h'),
        ).expect(409)
      ).body.detail,
    ).toMatch(/en pause/);
    await appel(awa, 'put', `/defis/${df.id}/participations/${deAwa}`, jeu('Hotfix Hero')).expect(
      409,
    );
    // Les votes continuent pendant la pause.
    await voter(clarisse, deLea);

    // 6. Reprise : Ibrahima puis Clarisse participent à leur tour.
    await appel(admin, 'delete', `/admin/defis/${df.id}/pause`).expect(200);
    await participer(ibrahima, df.id, 'Ctrl+Z, trois fois par partie');
    await participer(clarisse, df.id, 'Le café de 18 h, sans en renverser');
    p = await page(df.id);
    expect(p.defi?.participations).toBe(6);

    // 7. L'administration prolonge le défi de deux jours, puis le clôture avant sa fin.
    const prolonge = new Date(fin.getTime() + 2 * JOUR);
    const modifie = (
      await appel(admin, 'patch', `/admin/defis/${df.id}`, {
        ...deployFriday,
        dateFin: prolonge.toISOString(),
      }).expect(200)
    ).body as DefiAdministreApi;
    expect(modifie.dateFin).toBe(prolonge.toISOString());
    const clos = (await appel(admin, 'post', `/admin/defis/${df.id}/cloture`).expect(200))
      .body as DefiAdministreApi;
    expect(clos).toMatchObject({ statut: 'CLOTURE', actions: [], pauseDepuis: null });
    expect(new Date(clos.dateFin).getTime()).toBeLessThan(prolonge.getTime());

    // 8. Classement figé (RG-75 : votes, puis la participation publiée la première), points,
    //    notifications.
    p = await page(df.id);
    expect(p.defi?.etat).toBe('CLOTURE');
    expect(p.participations.map((x) => [x.creation.titre, x.rang])).toEqual([
      ['Hotfix Hero', 1],
      ['L’ascenseur est en panne', 2],
      ['git push vendredi', 3],
      ['Rollback Rush, le runner à rebours', 4],
      ['Ctrl+Z, trois fois par partie', 5],
      ['Le café de 18 h, sans en renverser', 6],
    ]);
    expect(p.termines[0]?.podium.map((x) => x.auteur.pseudo)).toEqual([
      'awa-sarr',
      'kofi-mensah',
      'moussa-diallo',
    ]);
    const points = async (id: number, motif: 'PARTICIPATION_DEFI' | 'PODIUM_DEFI') =>
      (
        await contexte.db
          .select({ points: mouvementReputation.points })
          .from(mouvementReputation)
          .where(
            and(eq(mouvementReputation.beneficiaireId, id), eq(mouvementReputation.motif, motif)),
          )
      ).reduce((s, x) => s + x.points, 0);
    expect(await points(membres.awa.id, 'PODIUM_DEFI')).toBe(50);
    expect(await points(membres.kofi.id, 'PODIUM_DEFI')).toBe(30);
    expect(await points(membres.moussa.id, 'PODIUM_DEFI')).toBe(20);
    expect(await points(membres.lea.id, 'PODIUM_DEFI')).toBe(0);
    for (const m of Object.values(membres))
      expect(await points(m.id, 'PARTICIPATION_DEFI')).toBe(5);
    const resultats = await contexte.db
      .select({ destinataire: notification.destinataireId })
      .from(notification)
      .where(eq(notification.type, 'RESULTAT_DEFI'));
    expect(resultats).toHaveLength(6);

    // 9. Après la clôture : plus de participation, plus de modification, plus de pause.
    await appel(lea, 'delete', `/defis/${df.id}/participations/${deLea}`).expect(409);
    await appel(admin, 'patch', `/admin/defis/${df.id}`, deployFriday).expect(409);
    await appel(admin, 'post', `/admin/defis/${df.id}/pause`).expect(409);
    await appel(admin, 'post', `/admin/defis/${df.id}/cloture`).expect(409);

    // 10. Le défi suivant s'ouvre maintenant : il devient le défi de la page.
    await appel(admin, 'post', `/admin/defis/${suivant.id}/ouverture`).expect(200);
    p = await page();
    expect(p.defi).toMatchObject({
      id: suivant.id,
      etat: 'EN_COURS',
      regles: ['10 secondes au plus'],
    });
    const journal = (await appel(admin, 'get', '/admin/journal?domaine=defis').expect(200))
      .body as { entrees?: { action: string }[] };
    expect(JSON.stringify(journal)).toContain('DEFI_PAUSE');
  });
});
