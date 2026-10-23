import { describe, expect, it } from 'vitest';
import {
  actionDemandee,
  actionsHTML,
  invitationHTML,
  motifAcces,
  raisonDuRefus,
  suite,
  type ContexteAcces,
} from './acces';
import { contexteArrivee } from './retour';

const contexte: ContexteAcces = {
  page: '/forum?type=question#reponses',
  adresse: 'http://localhost:4321/forum?type=question#reponses',
  niveau: 'apprenti',
  points: 182,
  suspension: '23 octobre 2026',
  conditions: '15 octobre 2026',
};

describe('suite', () => {
  it('transmet la page d’origine et l’action, lues ensuite par la connexion (lib/retour)', () => {
    const requete = suite('voter', contexte.page);
    const arrivee = contexteArrivee(new URLSearchParams(requete));
    expect(arrivee.destination).toBe('/forum?type=question#reponses');
    expect(arrivee.pour).toBe('voter');
    expect(arrivee.actif).toBe(true);
  });

  it('omet « pour » sans action', () => {
    expect(suite('', '/')).toBe('retour=%2F');
  });
});

describe('motifAcces (AUTH-06, raisons de refus)', () => {
  it('connexion : créer un compte ou se connecter, en revenant à la page', () => {
    const m = motifAcces('connexion', 'voter', contexte);
    expect(m.icone).toBe('user');
    expect(m.titre).toBe('Connectez-vous pour voter');
    expect(m.actions).toEqual([
      ['lien', 'Créer un compte', `/inscription?${suite('voter', contexte.page)}`, 'primary'],
      ['lien', 'Se connecter', `/connexion?${suite('voter', contexte.page)}`, 'secondary'],
    ]);
  });

  it('connexion pour signaler : le signalement sans compte passe par le contact', () => {
    const m = motifAcces('connexion', 'signaler ce contenu', contexte);
    expect(m.icone).toBe('flag');
    expect(m.actions[1]).toEqual([
      'lien',
      'Signaler sans compte',
      `/contact?motif=signalement&contenu=${encodeURIComponent(contexte.adresse)}`,
      'secondary',
    ]);
  });

  it('e-mail à confirmer : bouton de renvoi (RG-02)', () => {
    const m = motifAcces('email', 'publier une création', contexte);
    expect(m.titre).toBe('Confirmez votre adresse e-mail pour publier une création');
    expect(m.actions[0]).toEqual(['bouton', 'Renvoyer l’e-mail', 'email', 'primary']);
  });

  it('conditions : date des nouvelles versions et bouton d’acceptation (RG-03)', () => {
    const m = motifAcces('conditions', 'répondre', contexte);
    expect(m.texte).toBe(
      'Les conditions générales et la charte communautaire ont changé le 15 octobre 2026.',
    );
    expect(m.actions[0]).toEqual(['bouton', 'Accepter les conditions', 'conditions', 'primary']);
    expect(m.actions[1]?.[2]).toBe('/cgu#changements');
  });

  it('suspension : date de fin, sinon un titre sans date', () => {
    expect(motifAcces('suspendu', 'voter', contexte).titre).toBe(
      'Votre compte est suspendu jusqu’au 23 octobre 2026',
    );
    expect(motifAcces('suspendu', 'voter', { ...contexte, suspension: '' }).titre).toBe(
      'Votre compte est suspendu',
    );
  });

  it('niveau : niveau actuel, points et seuil Expert (RG-84)', () => {
    const m = motifAcces('niveau', 'proposer un cas', contexte);
    expect(m.titre).toBe('Le niveau Expert permet de proposer un cas');
    expect(m.texte).toBe(
      `Vous êtes Apprenti avec 182 points. Le niveau Expert commence à ${new Intl.NumberFormat('fr-FR').format(1500)} points.`,
    );
  });

  it('rôle : réservé à la modération, un seul bouton', () => {
    expect(motifAcces('role', 'modérer', contexte).actions).toEqual([
      ['fermer', 'Fermer', null, 'primary'],
    ]);
  });
});

describe('actionsHTML', () => {
  const actions = motifAcces('email', 'voter', contexte).actions;

  it('dialogue : bouton d’action et bouton de fermeture', () => {
    expect(actionsHTML(actions, false)).toBe(
      '<button class="btn btn-primary" type="button" data-acces-bouton="email">Renvoyer l’e-mail</button>' +
        '<button class="btn btn-secondary" type="button" data-acces-fermer>Plus tard</button>',
    );
  });

  it('dans la page : sans « Plus tard » ni « Fermer »', () => {
    expect(actionsHTML(actions, true)).not.toContain('data-acces-fermer');
  });

  it('échappe les adresses et les libellés', () => {
    const html = actionsHTML(motifAcces('connexion', '<b>voter</b>', contexte).actions, false);
    expect(html).not.toContain('<b>');
    expect(html).toContain('href="/inscription?retour=');
  });
});

describe('invitationHTML', () => {
  it('connexion : deux liens qui ramènent à la page', () => {
    const requete = suite('suivre votre progression', contexte.page).replaceAll('&', '&amp;');
    expect(invitationHTML('connexion', 'suivre votre progression', contexte)).toBe(
      `<a href="/inscription?${requete}">Créez un compte</a> ou <a href="/connexion?${requete}">connectez-vous</a> pour suivre votre progression.`,
    );
  });

  it('suspension : date de fin si elle est connue', () => {
    expect(invitationHTML('suspendu', 'voter', contexte)).toBe(
      'Vous pourrez voter à la fin de la suspension, le 23 octobre 2026.',
    );
    expect(invitationHTML('suspendu', 'voter', { ...contexte, suspension: '' })).toBe(
      'Vous pourrez voter à la fin de la suspension.',
    );
  });

  it('échappe l’action décrite', () => {
    expect(invitationHTML('email', '<img src=x>', contexte)).not.toContain('<img');
  });
});

describe('raisonDuRefus (réponses RFC 9457 de l’API)', () => {
  it('reprend la raison d’un 401 ou d’un 403', () => {
    expect(raisonDuRefus({ status: 403, code: 'INTERDIT', raison: 'conditions' })).toBe(
      'conditions',
    );
    expect(raisonDuRefus({ status: 401, code: 'NON_AUTHENTIFIE', raison: 'connexion' })).toBe(
      'connexion',
    );
  });

  it('un 401 « non authentifié » sans raison demande de se connecter', () => {
    expect(raisonDuRefus({ status: 401, code: 'NON_AUTHENTIFIE' })).toBe('connexion');
  });

  it('ignore les autres erreurs et les raisons inconnues', () => {
    expect(raisonDuRefus({ status: 401, code: 'IDENTIFIANTS_INCORRECTS' })).toBeNull();
    expect(raisonDuRefus({ status: 403, code: 'INTERDIT' })).toBeNull();
    expect(raisonDuRefus({ status: 403, code: 'INTERDIT', raison: 'autre' })).toBeNull();
    expect(raisonDuRefus({ status: 409, code: 'CONFLIT', raison: 'email' })).toBeNull();
  });
});

describe('actionDemandee', () => {
  it('lit l’action de data-exige, « contribuer » par défaut', () => {
    expect(actionDemandee('moderer')).toBe('moderer');
    expect(actionDemandee(undefined)).toBe('contribuer');
    expect(actionDemandee('inconnue')).toBe('contribuer');
  });
});
