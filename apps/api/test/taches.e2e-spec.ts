import { inArray } from 'drizzle-orm';
import request from 'supertest';
import {
  acceptationDocument,
  documentLegal,
  media,
  notification,
  session,
  tentativeConnexion,
} from '../src/db/schema/index.js';
import { dateDuJour } from '../src/modules/auth/documents-legaux.service.js';
import { TACHE_EMAIL } from '../src/modules/email/email.service.js';
import { TACHES_PLANIFIEES } from '../src/modules/taches/taches-planifiees.js';
import {
  ORIGINE_SITE,
  creerMembre,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

const JOUR_MS = 24 * 3600_000;
const ilYA = (jours: number) => new Date(Date.now() - jours * JOUR_MS);

describe('File des e-mails et tâches planifiées (EMAIL-01)', () => {
  let contexte: ApplicationDeTest;

  beforeAll(async () => {
    contexte = await demarrerApplication();
  });

  beforeEach(async () => {
    contexte.emails.length = 0;
    await vider(contexte.db, 'utilisateur', 'message_contact');
  });

  afterAll(async () => {
    await contexte.app.close();
  });

  it('met les e-mails en file chiffrés : ni adresse ni message en clair dans la base', async () => {
    const publier = vi.spyOn(contexte.taches, 'publier');
    await request(contexte.app.getHttpServer())
      .post('/api/v1/contact')
      .set('Origin', ORIGINE_SITE)
      .set('X-Forwarded-For', ipDeTest())
      .send({
        motif: 'QUESTION',
        nom: 'Awa Sarr',
        email: 'awa.sarr@example.com',
        message: 'Comment déclarer une reproduction partielle sur une création ?',
      })
      .expect(201);

    const envois = publier.mock.calls.filter(([nom]) => nom === TACHE_EMAIL);
    expect(envois).toHaveLength(2);
    for (const [, donnees] of envois) {
      expect(Object.keys(donnees)).toEqual(['chiffre']);
      expect(JSON.stringify(donnees)).not.toMatch(/awa|reproduction/i);
    }
    // Déchiffrés par la tâche, les e-mails arrivent intacts au transport.
    expect(contexte.emails.map((email) => email.a).toSorted()).toEqual([
      'awa.sarr@example.com',
      'equipe@vysora.local',
    ]);
    publier.mockRestore();
  });

  it('planifie chaque jour le nettoyage, les durées de conservation et l’annonce des documents', () => {
    expect(contexte.taches.planification(TACHES_PLANIFIEES.nettoyerMedias)).toBe('30 3 * * *');
    expect(contexte.taches.planification(TACHES_PLANIFIEES.appliquerConservation)).toBe(
      '0 4 * * *',
    );
    expect(contexte.taches.planification(TACHES_PLANIFIEES.annoncerDocuments)).toBe('0 8 * * *');
    expect(contexte.taches.planification(TACHE_EMAIL)).toBeUndefined();
  });

  it('supprime les images jamais enregistrées depuis 24 heures (MEDIA-01)', async () => {
    const membre = await creerMembre(contexte);
    const image = {
      televerseurId: membre.id,
      fichier: 'inexistant',
      typeMime: 'image/webp' as const,
      tailleOctets: 1000,
      texteAlternatif: 'Affiche de Ziguinchor',
    };
    const [, recente] = await contexte.db
      .insert(media)
      .values([
        { ...image, dateTeleversement: ilYA(2) },
        { ...image, dateTeleversement: new Date() },
      ])
      .returning({ id: media.id });

    await contexte.taches.lancer(TACHES_PLANIFIEES.nettoyerMedias);
    const restantes = await contexte.db.select({ id: media.id }).from(media);
    expect(restantes.map((ligne) => ligne.id)).toEqual([recente?.id]);
  });

  it('applique les durées de conservation : sessions expirées, connexions d’un an, notifications de 12 mois', async () => {
    const membre = await creerMembre(contexte);
    await contexte.db.insert(session).values([
      { id: 'a'.repeat(64), utilisateurId: membre.id, dateExpiration: ilYA(1) },
      {
        id: 'b'.repeat(64),
        utilisateurId: membre.id,
        dateExpiration: new Date(Date.now() + JOUR_MS),
      },
    ]);
    await contexte.db.insert(tentativeConnexion).values([
      { utilisateurId: membre.id, reussie: false, date: ilYA(366) },
      { utilisateurId: membre.id, reussie: true, date: ilYA(364) },
    ]);
    const mois = (n: number) => {
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() - n);
      return date;
    };
    await contexte.db.insert(notification).values([
      { destinataireId: membre.id, type: 'NIVEAU_ATTEINT', date: mois(13) },
      { destinataireId: membre.id, type: 'NIVEAU_ATTEINT', date: mois(11) },
    ]);

    await contexte.taches.lancer(TACHES_PLANIFIEES.appliquerConservation);
    expect((await contexte.db.select().from(session)).map((ligne) => ligne.id)).toEqual([
      'b'.repeat(64),
    ]);
    expect((await contexte.db.select().from(tentativeConnexion)).map((t) => t.reussie)).toEqual([
      true,
    ]);
    const restantes = await contexte.db.select().from(notification);
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.date.getTime()).toBeGreaterThan(mois(12).getTime());

    // Rejouée, la tâche ne supprime rien de plus.
    await contexte.taches.lancer(TACHES_PLANIFIEES.appliquerConservation);
    expect(await contexte.db.$count(notification)).toBe(1);
  });

  describe('Annonce d’une nouvelle version d’un document légal (RG-90, WF-03)', () => {
    const ajoutes: number[] = [];
    const ajouter = async (
      valeurs: Partial<typeof documentLegal.$inferInsert> & {
        type: 'CGU' | 'CONFIDENTIALITE' | 'CHARTE';
        dateEffet: string;
      },
    ) => {
      const [ligne] = await contexte.db
        .insert(documentLegal)
        .values({
          version: `${valeurs.dateEffet}-essai`,
          url:
            valeurs.type === 'CGU'
              ? '/cgu'
              : valeurs.type === 'CHARTE'
                ? '/charte-communautaire'
                : '/confidentialite',
          ...valeurs,
        })
        .returning();
      if (!ligne) throw new Error('Version non créée');
      ajoutes.push(ligne.id);
      return ligne;
    };

    afterAll(async () => {
      // Les autres fichiers de test retrouvent les seules versions des référentiels.
      await vider(contexte.db, 'utilisateur');
      await contexte.db.delete(documentLegal).where(inArray(documentLegal.id, ajoutes));
    });

    it('informe une fois les membres actifs concernés, à la date d’effet', async () => {
      const aujourdhui = dateDuJour();
      const avant = { dateInscription: ilYA(10) };
      // Première exécution : les versions des référentiels sont des premières versions, rien à annoncer.
      await contexte.taches.lancer(TACHES_PLANIFIEES.annoncerDocuments);
      expect(contexte.emails).toHaveLength(0);

      const awa = await creerMembre(contexte, avant);
      await creerMembre(contexte, {
        ...avant,
        pseudo: 'non-verifiee',
        email: 'non.verifiee@example.com',
        emailVerifie: false,
      });
      await creerMembre(contexte, {
        ...avant,
        pseudo: 'bannie',
        email: 'bannie@example.com',
        statutCompte: 'BANNI',
      });
      // Inscrite aujourd'hui : elle a accepté la nouvelle version en s'inscrivant.
      await creerMembre(contexte, { pseudo: 'nouvelle', email: 'nouvelle@example.com' });
      const deja = await creerMembre(contexte, {
        ...avant,
        pseudo: 'deja-acceptee',
        email: 'deja@example.com',
      });

      const charte = await ajouter({
        type: 'CHARTE',
        dateEffet: aujourdhui,
        resumeChangements: 'Les demandes d’aide se publient dans le forum.',
      });
      const cguAVenir = await ajouter({
        type: 'CGU',
        dateEffet: dateDuJour(new Date(Date.now() + 2 * JOUR_MS)),
      });
      await contexte.db
        .insert(acceptationDocument)
        .values({ utilisateurId: deja.id, documentLegalId: charte.id });

      await contexte.taches.lancer(TACHES_PLANIFIEES.annoncerDocuments);
      expect(contexte.emails.map((email) => email.a)).toEqual([awa.email]);
      expect(contexte.emails[0]).toMatchObject({
        sujet: 'Nouvelle version de la charte communautaire',
      });
      expect(contexte.emails[0]?.texte).toContain(
        'Ce qui change : Les demandes d’aide se publient dans le forum.',
      );
      expect(contexte.emails[0]?.texte).toContain('http://localhost:4321/charte-communautaire');

      // Une seule fois ; la version à venir attend sa date d'effet.
      await contexte.taches.lancer(TACHES_PLANIFIEES.annoncerDocuments);
      expect(contexte.emails).toHaveLength(1);
      const [enAttente] = await contexte.db
        .select({ dateAnnonce: documentLegal.dateAnnonce })
        .from(documentLegal)
        .where(inArray(documentLegal.id, [cguAVenir.id]));
      expect(enAttente?.dateAnnonce).toBeNull();
    });

    it('regroupe en un e-mail les versions entrées en vigueur le même jour', async () => {
      const awa = await creerMembre(contexte, { dateInscription: ilYA(10) });
      const aujourdhui = dateDuJour();
      await ajouter({ type: 'CGU', dateEffet: aujourdhui });
      await ajouter({ type: 'CONFIDENTIALITE', dateEffet: aujourdhui, acceptationRequise: false });

      await contexte.taches.lancer(TACHES_PLANIFIEES.annoncerDocuments);
      expect(contexte.emails).toHaveLength(1);
      expect(contexte.emails[0]).toMatchObject({
        a: awa.email,
        sujet: 'Nouvelles versions des documents de Vysora',
      });
      expect(contexte.emails[0]?.texte).toContain(
        'Acceptez les conditions générales d’utilisation lors de votre prochaine visite',
      );
    });
  });
});
