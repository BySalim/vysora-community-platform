import type {
  ComplementsSavoirsApi,
  JournalAuditApi,
  MomentsCreationApi,
  SavoirsAdministresApi,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { contenu, etape, momentCle, sujet } from '../src/db/schema/index.js';
import {
  confirmerIdentite,
  creerCreation,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  MOT_DE_PASSE,
  ORIGINE_SITE,
  vider,
  type ApplicationDeTest,
} from './outils.js';

type Agent = InstanceType<typeof TestAgent>;

describe('Compléments des savoirs d’Apprendre (APP-03)', () => {
  let contexte: ApplicationDeTest;
  let auteurId: number;
  const serveur = () => contexte.app.getHttpServer();

  async function agentConnecte(email: string, confirme = true): Promise<Agent> {
    const ip = ipDeTest();
    const agent = request.agent(serveur());
    await agent
      .post('/api/v1/session')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ip)
      .send({ email, motDePasse: MOT_DE_PASSE })
      .expect(200);
    if (confirme) await confirmerIdentite(contexte, email);
    return agent.set('Origin', ORIGINE_SITE).set('X-Forwarded-For', ip);
  }
  const admin = () => agentConnecte('claire@example.com');
  const publics = async () =>
    (await request(serveur()).get('/api/v1/savoirs/complements').expect(200))
      .body as ComplementsSavoirsApi;

  /** Création publiée avec deux moments clés, dans l'ordre du parcours. */
  async function creationAvecMoments(): Promise<{ id: number; moments: number[] }> {
    const id = await creerCreation(contexte, auteurId);
    const [e1, e2] = await contexte.db
      .insert(etape)
      .values([
        { creationId: id, ordre: 1 },
        { creationId: id, ordre: 0 },
      ])
      .returning({ id: etape.id });
    const [deuxieme] = await contexte.db
      .insert(momentCle)
      .values({
        etapeId: e1!.id,
        type: 'DECOUVERTE',
        explication: 'Un détail précis évite les réponses identiques.',
      })
      .returning({ id: momentCle.id });
    const [premier] = await contexte.db
      .insert(momentCle)
      .values({
        etapeId: e2!.id,
        type: 'CORRECTION',
        explication: 'La lettre citait enfin des faits.',
      })
      .returning({ id: momentCle.id });
    return { id, moments: [premier!.id, deuxieme!.id] };
  }

  async function nouveauSujet(statut: 'VISIBLE' | 'MASQUE' = 'VISIBLE'): Promise<number> {
    const [ligne] = await contexte.db
      .insert(contenu)
      .values({ typeContenu: 'SUJET', auteurId, statut })
      .returning({ id: contenu.id });
    await contexte.db.insert(sujet).values({
      id: ligne!.id,
      typeSujet: 'DISCUSSION',
      titre: 'Comment garder un ton naturel ?',
      slug: 'comment-garder-un-ton-naturel',
      corps: 'Les textes générés sonnent tous pareil : comment leur garder une voix ?',
    });
    return ligne!.id;
  }

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });
  beforeEach(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit');
    await vider(contexte.db, 'illustration_savoir', 'sujet_savoir');
    await creerMembre(contexte, {
      pseudo: 'claire-dubois',
      email: 'claire@example.com',
      role: 'ADMINISTRATEUR',
    });
    auteurId = (await creerMembre(contexte)).id;
  });
  afterAll(async () => {
    await vider(contexte.db, 'utilisateur', 'contenu', 'journal_audit');
    await vider(contexte.db, 'illustration_savoir', 'sujet_savoir');
    await contexte.app.close();
  });

  it('est réservé aux administrateurs ; la lecture publique est ouverte à tous', async () => {
    await request(serveur()).get('/api/v1/admin/savoirs').expect(401);
    const membre = await agentConnecte('awa.sarr@example.com', false);
    await membre.get('/api/v1/admin/savoirs').expect(403);
    expect(await publics()).toEqual({ illustrations: {}, sujets: {} });
  });

  it('illustre un savoir de moments clés choisis, montrés tant que la création est visible (RG-30)', async () => {
    const a = await admin();
    const { id, moments } = await creationAvecMoments();
    const lus = (await a.get(`/api/v1/admin/creations/${id}/moments`).expect(200))
      .body as MomentsCreationApi;
    // Dans l'ordre du parcours : étapes, puis moments.
    expect(lus.moments.map((m) => [m.id, m.type])).toEqual([
      [moments[0], 'CORRECTION'],
      [moments[1], 'DECOUVERTE'],
    ]);

    const ajouter = (corps: object, savoir = 'demande-claire') =>
      a.post(`/api/v1/admin/savoirs/${savoir}/illustrations`).send(corps);
    await ajouter({ creationId: id, momentId: moments[0] }).expect(201);
    await ajouter({ creationId: id, note: 'Reproduite avec succès sur trois modèles.' }).expect(
      201,
    );
    // Un moment déjà choisi, un moment d'une autre création, ni moment ni note : refusés.
    await ajouter({ creationId: id, momentId: moments[0] }).expect(409);
    await ajouter({ creationId: id, momentId: 999_999 }).expect(400);
    expect((await ajouter({ creationId: id }).expect(400)).body.erreurs.note).toContain(
      'moment clé',
    );
    await ajouter({ creationId: id, momentId: moments[1] }, 'Pas un savoir').expect(404);
    const brouillon = await creerCreation(contexte, auteurId, { publiee: false });
    await ajouter({ creationId: brouillon, note: 'Une note.' }).expect(409);
    await a.get(`/api/v1/admin/creations/${brouillon}/moments`).expect(404);

    const vus = (await publics()).illustrations['demande-claire']!;
    expect(vus.map((i) => [i.moment?.type ?? null, i.note])).toEqual([
      ['CORRECTION', null],
      [null, 'Reproduite avec succès sur trois modèles.'],
    ]);
    expect(vus[0]).toMatchObject({
      creation: { id, type: 'UN_PROMPT', auteur: { pseudo: 'awa-sarr' } },
      moment: { texte: 'La lettre citait enfin des faits.' },
    });

    // L'auteur réécrit sa création : ses moments sont recréés, le moment choisi disparaît.
    await contexte.db.delete(momentCle).where(eq(momentCle.id, moments[0]!));
    let suivi = (await a.get('/api/v1/admin/savoirs').expect(200)).body as SavoirsAdministresApi;
    expect(suivi.illustrations['demande-claire']!.map((i) => i.etat)).toEqual([
      'MOMENT_DISPARU',
      'MONTREE',
    ]);
    expect((await publics()).illustrations['demande-claire']).toHaveLength(1);
    // Masquée, la création n'est plus montrée ; l'administration le voit.
    await contexte.db.update(contenu).set({ statut: 'MASQUE' }).where(eq(contenu.id, id));
    suivi = (await a.get('/api/v1/admin/savoirs').expect(200)).body as SavoirsAdministresApi;
    expect(suivi.illustrations['demande-claire']!.map((i) => i.etat)).toEqual([
      'CREATION_INVISIBLE',
      'CREATION_INVISIBLE',
    ]);
    expect((await publics()).illustrations).toEqual({});

    const [premiere] = suivi.illustrations['demande-claire']!;
    await a.delete(`/api/v1/admin/illustrations-savoirs/${premiere!.id}`).expect(200);
    await a.delete(`/api/v1/admin/illustrations-savoirs/${premiere!.id}`).expect(404);
    const journal = (await a.get('/api/v1/admin/journal?domaine=apprendre').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.map((e) => e.action)).toEqual([
      'SAVOIR_ILLUSTRATION_RETIREE',
      'SAVOIR_ILLUSTRATION_AJOUTEE',
      'SAVOIR_ILLUSTRATION_AJOUTEE',
    ]);
    expect(journal.elements[0]).toMatchObject({
      cible: { type: 'creation', id, nom: 'Cité imaginaire entre ciel et mer' },
      details: { savoir: 'demande-claire' },
    });
  });

  it('borne le nombre d’illustrations d’un savoir', async () => {
    const a = await admin();
    const { id } = await creationAvecMoments();
    for (let i = 0; i < 6; i += 1)
      await a
        .post('/api/v1/admin/savoirs/biais/illustrations')
        .send({ creationId: id, note: `Note ${i}` })
        .expect(i === 0 ? 201 : 409);
    // Une même création sans moment ne se cite qu'une fois ; d'autres créations, jusqu'à six.
    for (let i = 0; i < 5; i += 1) {
      const autre = await creerCreation(contexte, auteurId);
      await a
        .post('/api/v1/admin/savoirs/biais/illustrations')
        .send({ creationId: autre, note: 'Une autre création.' })
        .expect(201);
    }
    const septieme = await creerCreation(contexte, auteurId);
    expect(
      (
        await a
          .post('/api/v1/admin/savoirs/biais/illustrations')
          .send({ creationId: septieme, note: 'Une de trop.' })
          .expect(409)
      ).body.detail,
    ).toContain('6 illustrations au plus');
  });

  it('lie un sujet du forum visible, le remplace, puis le retire', async () => {
    const a = await admin();
    const premier = await nouveauSujet();
    const second = await nouveauSujet();
    const masque = await nouveauSujet('MASQUE');
    await a.put('/api/v1/admin/savoirs/demande-claire/sujet').send({ sujetId: masque }).expect(409);
    await a
      .put('/api/v1/admin/savoirs/demande-claire/sujet')
      .send({ sujetId: premier })
      .expect(200);
    expect((await publics()).sujets['demande-claire']).toMatchObject({
      id: premier,
      typeSujet: 'DISCUSSION',
      etat: 'OUVERT',
    });
    await a.put('/api/v1/admin/savoirs/demande-claire/sujet').send({ sujetId: second }).expect(200);
    expect((await publics()).sujets['demande-claire']?.id).toBe(second);
    // Masqué ensuite, il n'est plus montré.
    await contexte.db.update(contenu).set({ statut: 'MASQUE' }).where(eq(contenu.id, second));
    expect((await publics()).sujets).toEqual({});
    expect(
      ((await a.get('/api/v1/admin/savoirs').expect(200)).body as SavoirsAdministresApi).sujets[
        'demande-claire'
      ],
    ).toMatchObject({ id: second, visible: false });
    await a.delete('/api/v1/admin/savoirs/demande-claire/sujet').expect(200);
    await a.delete('/api/v1/admin/savoirs/demande-claire/sujet').expect(404);
    const journal = (await a.get('/api/v1/admin/journal?domaine=apprendre').expect(200))
      .body as JournalAuditApi;
    expect(journal.elements.map((e) => e.action)).toEqual([
      'SAVOIR_SUJET_RETIRE',
      'SAVOIR_SUJET_LIE',
      'SAVOIR_SUJET_LIE',
    ]);
    expect(journal.elements[1]).toMatchObject({
      details: { savoir: 'demande-claire', avant: premier },
    });
  });
});
