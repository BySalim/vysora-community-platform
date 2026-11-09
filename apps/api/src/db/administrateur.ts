import { DELAIS, erreursParChamp, schemaAjoutEquipe } from '@vysora/shared';
import { ErreurApplication } from '../commun/erreurs.js';
import { lireConfiguration } from '../config/env.js';
import { ActivationService } from '../modules/auth/activation.service.js';
import { JetonsService } from '../modules/auth/jetons.service.js';
import { EmailService } from '../modules/email/email.service.js';
import { TransportEmail } from '../modules/email/transport-email.js';
import { EquipeService } from '../modules/administration/equipe.service.js';
import { FileTachesPublication } from '../modules/file/file-publication.js';
import { creerBaseDeDonnees } from './client.js';

/* ADM-03 : nomme un administrateur depuis le serveur, sans passer par le site. Sert pour le tout
   premier administrateur, ou si plus aucun administrateur ne peut se connecter.
     node dist/db/administrateur.js <adresse> <Prénom Nom>      (image de l'API)
     pnpm administrateur:nommer -- <adresse> <Prénom Nom>       (développement)
   - adresse inconnue : compte créé avec le rôle Administrateur, lien d'activation envoyé à l'adresse ;
   - compte qui attend encore son activation : nouveau lien ;
   - compte actif à l'adresse confirmée : nommé administrateur.
   L'e-mail part par la file de l'API : l'API doit tourner. La personne choisit son mot de passe depuis
   le lien, puis configure la vérification en deux étapes à sa première connexion (SEC-02). */

const [email = '', ...mots] = process.argv.slice(2).filter((argument) => argument !== '--');
const saisie = schemaAjoutEquipe.safeParse({ email, nom: mots.join(' '), role: 'ADMINISTRATEUR' });
if (!saisie.success) {
  for (const message of Object.values(erreursParChamp(saisie.error))) console.error(message);
  console.error('Usage : node dist/db/administrateur.js <adresse> <Prénom Nom>');
  process.exit(1);
}

const config = lireConfiguration();
const { db, pool } = creerBaseDeDonnees(config.DATABASE_URL);
const file = new FileTachesPublication(config);
const emails = new EmailService(config, file, new TransportEmail(config));
emails.onModuleInit();
await file.demarrer();
try {
  const activation = new ActivationService(config, new JetonsService(db), emails);
  const equipe = new EquipeService(db, config, activation);
  const { pseudo, issue } = await equipe.nommerAdministrateur(saisie.data.email, saisie.data.nom);
  const jours = `valable ${DELAIS.lienActivationJours} jours`;
  console.log(
    {
      cree: `Compte créé : @${pseudo}, rôle Administrateur. Lien d’activation envoyé à ${saisie.data.email} (${jours}).`,
      'lien-renvoye': `Le compte @${pseudo} attend son activation : nouveau lien envoyé à ${saisie.data.email} (${jours}).`,
      promu: `Le compte @${pseudo} est maintenant administrateur. La vérification en deux étapes lui sera demandée à sa prochaine connexion.`,
      'deja-administrateur': `Le compte @${pseudo} est déjà administrateur : rien n’a changé.`,
    }[issue],
  );
} catch (erreur) {
  if (!(erreur instanceof ErreurApplication)) throw erreur;
  console.error(Object.values(erreur.erreurs ?? {})[0] ?? erreur.message);
  process.exitCode = 1;
} finally {
  await file.arreter();
  await pool.end();
}
