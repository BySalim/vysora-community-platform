import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';

/* Configuration de l'API, lue dans l'environnement et validée au démarrage :
   une variable manquante ou invalide arrête l'application avec un message explicite. */

const NIVEAUX_JOURNAL = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const schemaEnvironnement = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** OPS-01 : une préproduction tourne avec NODE_ENV=production mais accepte les données de
        démonstration (pnpm db:demo) ; la production les refuse. */
    ENVIRONNEMENT: z.enum(['developpement', 'preproduction', 'production']).optional(),
    /** OPS-01 : mot de passe des comptes de démonstration d'une préproduction, propre au serveur
        (celui du dépôt est public : il ouvrirait les comptes d'équipe de la démonstration). */
    MOT_DE_PASSE_DEMO: z.string().optional(),
    LOG_LEVEL: z.enum(NIVEAUX_JOURNAL).default('info'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    SITE_URL: z.url().default('http://localhost:4321'),
    ORIGINES_AUTORISEES: z
      .string()
      .default('http://localhost:4321')
      .transform((valeur) =>
        valeur
          .split(',')
          .map((origine) => origine.trim().replace(/\/$/, ''))
          .filter(Boolean),
      ),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),
    SMTP_URL: z.string().min(1).default('smtp://127.0.0.1:1025'),
    EMAIL_EXPEDITEUR: z.string().min(3).default('Vysora <ne-pas-repondre@vysora.local>'),
    EMAIL_EQUIPE: z.string().min(3).default('equipe@vysora.local'),
    SEL_EMPREINTES: z.string().min(16, 'SEL_EMPREINTES doit compter 16 caractères au moins'),
    CLE_CHIFFREMENT: z.string().refine((valeur) => Buffer.from(valeur, 'base64url').length === 32, {
      error: 'CLE_CHIFFREMENT doit encoder 32 octets en base64url',
    }),
    STOCKAGE_DOSSIER: z.string().default('./stockage'),
    /** RG-04 : refus des mots de passe présents dans des fuites connues (Have I Been Pwned, k-anonymat). */
    VERIFIER_FUITES: z.stringbool().default(true),
    /** INV-01 : pendant la bêta fermée, l'inscription exige un code d'invitation à usage unique. */
    INSCRIPTION_SUR_INVITATION: z.stringbool().default(false),
    /** F-02, S-10 : identifiants des applications OAuth. Un service sans identifiants reste fermé
        (le bouton le dit). Adresse de retour à déclarer : <SITE_URL>/api/v1/auth/<service>/retour. */
    GITHUB_CLIENT_ID: z.string().trim().optional(),
    GITHUB_CLIENT_SECRET: z.string().trim().optional(),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  })
  .superRefine((env, ctx) => {
    // Un identifiant sans son secret (ou l'inverse) est une erreur de configuration, pas un service fermé.
    for (const service of ['GITHUB', 'GOOGLE'] as const) {
      const id = env[`${service}_CLIENT_ID`];
      const secret = env[`${service}_CLIENT_SECRET`];
      if (Boolean(id) !== Boolean(secret))
        ctx.addIssue({
          code: 'custom',
          path: [id ? `${service}_CLIENT_SECRET` : `${service}_CLIENT_ID`],
          message: `${service}_CLIENT_ID et ${service}_CLIENT_SECRET vont ensemble`,
        });
    }
    if (env.NODE_ENV !== 'production') return;
    // En production, aucun secret de développement ne doit subsister.
    if (env.SEL_EMPREINTES.startsWith('dev-'))
      ctx.addIssue({
        code: 'custom',
        path: ['SEL_EMPREINTES'],
        message: 'secret de développement en production',
      });
    if (Buffer.from(env.CLE_CHIFFREMENT, 'base64url').toString().startsWith('vysora-dev'))
      ctx.addIssue({
        code: 'custom',
        path: ['CLE_CHIFFREMENT'],
        message: 'clé de développement en production',
      });
  });

export type Configuration = z.output<typeof schemaEnvironnement>;

/** Cherche le fichier .env du dépôt depuis le dossier courant (apps/api ou la racine). */
function chargerFichierEnv(): void {
  let dossier = resolve(process.cwd());
  for (let i = 0; i < 4; i += 1) {
    const fichier = join(dossier, '.env');
    if (existsSync(fichier)) {
      // Les variables déjà définies (CI, tests, conteneur) gardent la priorité.
      process.loadEnvFile(fichier);
      return;
    }
    dossier = dirname(dossier);
  }
}

let configuration: Configuration | undefined;

export function lireConfiguration(): Configuration {
  if (configuration) return configuration;
  chargerFichierEnv();
  const resultat = schemaEnvironnement.safeParse(process.env);
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((probleme) => `  - ${probleme.path.join('.')} : ${probleme.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  configuration = resultat.data;
  return configuration;
}
