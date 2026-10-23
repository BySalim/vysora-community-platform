import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import type { SessionApi } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import {
  chargerDemo,
  decrireBilan,
  DemoRefusee,
  emailDemo,
  type BilanDemo,
} from '../src/db/demo/charger.js';
import { MOT_DE_PASSE_DEMO } from '../src/db/demo/identifiants.js';
import { utilisateur } from '../src/db/schema/index.js';
import { DocumentsLegauxService } from '../src/modules/auth/documents-legaux.service.js';
import {
  ORIGINE_SITE,
  demarrerApplication,
  ipDeTest,
  vider,
  type ApplicationDeTest,
} from './outils.js';

/* DEMO-01 : données de démonstration tirées du prototype. Un seul chargement sert à toute la suite. */

const TABLES = [
  'utilisateur',
  'acceptation_document',
  'obtention_badge',
  'defi',
  'contenu',
  'creation',
  'etape',
  'configuration_ia',
  'echange',
  'moment_cle',
  'lien_externe',
  'contenu_etiquette',
  'etiquette',
  'commentaire',
  'reproduction',
  'sujet',
  'message',
  'cas_bon_reflexe',
  'option_reponse',
  'choix_option',
  'vote',
  'enregistrement',
  'signalement_obsolescence',
  'mouvement_reputation',
] as const;

describe('Données de démonstration (DEMO-01, pnpm db:demo)', () => {
  let contexte: ApplicationDeTest;
  let bilan: BilanDemo;
  // Un vendredi : la semaine en cours a commencé le lundi 19 octobre (RG-87).
  const maintenant = new Date('2026-10-23T14:00:00Z');

  const compter = async (): Promise<Record<string, number>> => {
    const lignes = await Promise.all(
      TABLES.map((table) =>
        contexte.db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from "${table}"`)),
      ),
    );
    return Object.fromEntries(TABLES.map((table, i) => [table, lignes[i]?.rows[0]?.n ?? -1]));
  };
  const valeur = async (requete: ReturnType<typeof sql>): Promise<unknown> =>
    Object.values((await contexte.db.execute(requete)).rows[0] ?? {})[0];

  beforeAll(async () => {
    contexte = await demarrerApplication();
    await vider(contexte.db, 'utilisateur');
    bilan = await chargerDemo(contexte.db, { environnement: 'test', maintenant });
  }, 180_000);

  afterAll(async () => {
    await vider(contexte.db, 'utilisateur');
    await contexte.app.close();
  });

  describe('refus en production', () => {
    it('refuse le chargement quand NODE_ENV vaut production, sans rien écrire', async () => {
      const avant = await compter();
      await expect(
        chargerDemo(contexte.db, { environnement: 'production', maintenant }),
      ).rejects.toBeInstanceOf(DemoRefusee);
      expect(await compter()).toEqual(avant);
    });

    it('fait échouer la commande pnpm db:demo en production', async () => {
      const avant = await compter();
      const resultat = spawnSync(process.execPath, ['--import', 'tsx', 'src/db/demo/index.ts'], {
        cwd: resolve(import.meta.dirname, '..'),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          // Secrets d'allure réelle : la configuration de production les exige (env.ts).
          SEL_EMPREINTES: randomBytes(24).toString('base64url'),
          CLE_CHIFFREMENT: randomBytes(32).toString('base64url'),
        },
      });
      expect(resultat.status).toBe(1);
      expect(resultat.stderr).toContain('NODE_ENV vaut production');
      expect(await compter()).toEqual(avant);
    }, 60_000);
  });

  describe('chargement', () => {
    it('charge les membres, les créations, le forum, les cas et les défis du prototype', () => {
      expect(bilan).toMatchObject({
        membres: 53,
        defis: 3,
        creations: 50,
        commentaires: 2,
        sujets: 17,
        messages: 39,
        cas: 8,
        enregistrements: 8,
      });
      expect(bilan.reproductions).toBeGreaterThan(250);
      expect(bilan.votes).toBeGreaterThan(1500);
      expect(decrireBilan(bilan)).toContain('53 membres');
    });

    it('crée des comptes vérifiés, en example.test, hachés en Argon2id, documents en vigueur acceptés', async () => {
      const membres = await contexte.db.select().from(utilisateur);
      expect(membres).toHaveLength(53);
      for (const m of membres) {
        expect(m.email).toBe(emailDemo(m.pseudo));
        expect(m.emailVerifie).toBe(true);
        expect(m.empreinteMotDePasse).toMatch(/^\$argon2id\$/);
      }
      const documents = contexte.app.get(DocumentsLegauxService);
      for (const m of membres) expect(await documents.aAccepter(m.id)).toEqual([]);
      expect(membres.filter((m) => m.role !== 'MEMBRE').map((m) => [m.pseudo, m.role])).toEqual([
        ['moderation-demo', 'MODERATEUR'],
        ['administration-demo', 'ADMINISTRATEUR'],
      ]);
    });

    it('respecte les règles des votes, des essais, des réponses et des cas', async () => {
      // RG-40 : personne ne vote pour son propre contenu.
      expect(
        await valeur(
          sql`select count(*)::int from vote v join contenu c on c.id = v.contenu_id where v.votant_id = c.auteur_id`,
        ),
      ).toBe(0);
      // RG-41 : « Testé, ça marche » seulement sur une astuce.
      expect(
        await valeur(
          sql`select count(*)::int from vote v left join sujet s on s.id = v.contenu_id where v.type_vote_code = 'TESTE_OK' and s.type_sujet is distinct from 'ASTUCE'`,
        ),
      ).toBe(0);
      // RG-42 : l'auteur ne reproduit pas sa création, seulement un prompt ou une itération publiés.
      expect(
        await valeur(
          sql`select count(*)::int from reproduction r join contenu rc on rc.id = r.id join contenu cc on cc.id = r.creation_id join creation c on c.id = r.creation_id where rc.auteur_id = cc.auteur_id or c.type_creation = 'PROJET' or c.statut_publication <> 'PUBLIEE'`,
        ),
      ).toBe(0);
      // RG-72 : l'auteur d'un cas n'y répond pas. CI-16 : une seule option correcte, de 2 à 5 options.
      expect(
        await valeur(
          sql`select count(*)::int from choix_option ch join contenu c on c.id = ch.cas_id where ch.utilisateur_id = c.auteur_id`,
        ),
      ).toBe(0);
      expect(
        await valeur(
          sql`select count(*)::int from (select cas_id from option_reponse group by cas_id having count(*) filter (where est_correcte) <> 1 or count(*) not between 2 and 5) x`,
        ),
      ).toBe(0);
      // RG-10 : 5 étiquettes au plus par contenu.
      expect(
        await valeur(
          sql`select count(*)::int from (select contenu_id from contenu_etiquette group by contenu_id having count(*) > 5) x`,
        ),
      ).toBe(0);
    });

    it('date le contenu le plus récent de quelques minutes, sans rien dans le futur', async () => {
      const date = async (requete: ReturnType<typeof sql>) =>
        new Date(String(await valeur(requete))).getTime();
      const dernier = await date(sql`select max(date_publication) from creation`);
      expect(maintenant.getTime() - dernier).toBeLessThan(15 * 60_000);
      for (const requete of [
        sql`select max(date_creation) from contenu`,
        sql`select max(date_vote) from vote`,
        sql`select max(date) from mouvement_reputation`,
        sql`select max(date_choix) from choix_option`,
        sql`select max(date_inscription) from utilisateur`,
      ])
        expect(await date(requete)).toBeLessThanOrEqual(maintenant.getTime());
    });

    it('reprend la réputation du prototype : niveaux et points de la semaine (RG-84, RG-87)', async () => {
      const semaine = (
        await contexte.db.execute<{ pseudo: string; points: number }>(
          sql`select u.pseudo, sum(m.points)::int as points from mouvement_reputation m join utilisateur u on u.id = m.beneficiaire_id where m.date >= '2026-10-19T00:00:00Z' group by u.pseudo order by points desc limit 5`,
        )
      ).rows;
      expect(semaine).toEqual([
        { pseudo: 'claire-dubois', points: 412 },
        { pseudo: 'kofi-mensah', points: 365 },
        { pseudo: 'aissatou-ndiaye', points: 341 },
        { pseudo: 'moussa-diallo', points: 296 },
        { pseudo: 'yacine-benali', points: 254 },
      ]);
    });

    it('ouvre les comptes avec le mot de passe de développement, au niveau du prototype', async () => {
      const ip = ipDeTest();
      for (const [pseudo, niveau, points] of [
        ['claire-dubois', 'maitre', 8214],
        ['lea-martin', 'apprenti', 286],
        ['clarisse-mendy', 'apprenti', 182],
        ['sebastien-roy', 'curieux', 46],
      ] as const) {
        const agent = request.agent(contexte.app.getHttpServer());
        await agent
          .post('/api/v1/session')
          .set('Origin', ORIGINE_SITE)
          .set('X-Forwarded-For', ip)
          .send({ email: emailDemo(pseudo), motDePasse: MOT_DE_PASSE_DEMO })
          .expect(200);
        const session = (await agent.get('/api/v1/session').expect(200)).body as SessionApi;
        expect(session.etat).toMatchObject({ session: 'membre', niveau, compte: 'actif' });
        expect(session.membre).toMatchObject({ pseudo, points });
      }
    });
  });

  describe('idempotence', () => {
    it('relancé, n’ajoute rien et ne modifie rien', async () => {
      const avant = await compter();
      const second = await chargerDemo(contexte.db, {
        environnement: 'test',
        maintenant: new Date(maintenant.getTime() + 24 * 60 * 60_000),
      });
      expect(Object.values(second).every((n) => n === 0)).toBe(true);
      expect(decrireBilan(second)).toBe('Données de démonstration déjà chargées : rien à ajouter.');
      expect(await compter()).toEqual(avant);
    }, 60_000);
  });
});
