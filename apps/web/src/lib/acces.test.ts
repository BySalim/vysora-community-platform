import { describe, expect, it } from 'vitest';
import {
  actionsAccesHtml,
  blocAccesHtml,
  contexteServeur,
  invitationHtml,
  messageAcces,
  type ContexteAcces,
} from './acces';

const CONTEXTE: ContexteAcces = {
  page: '/forum?type=question#reponses',
  adresse: 'https://vysora.fr/forum?type=question#reponses',
  suspensionJusqua: '2026-11-02T10:00:00.000Z',
  conditionsDepuis: '2026-10-15',
  niveau: 'apprenti',
  points: 182,
};

describe('messageAcces', () => {
  it('propose l’inscription puis la connexion, avec la page d’origine et l’action', () => {
    const m = messageAcces('connexion', 'voter', CONTEXTE);
    expect(m.titre).toBe('Connectez-vous pour voter');
    const suite = 'retour=%2Fforum%3Ftype%3Dquestion%23reponses&pour=voter';
    expect(m.actions).toEqual([
      {
        genre: 'lien',
        libelle: 'Créer un compte',
        cible: `/inscription?${suite}`,
        style: 'primary',
      },
      { genre: 'lien', libelle: 'Se connecter', cible: `/connexion?${suite}`, style: 'secondary' },
    ]);
  });

  it('pour un signalement, propose aussi le formulaire de contact sans compte', () => {
    const m = messageAcces('connexion', 'signaler ce contenu', CONTEXTE);
    expect(m.icone).toBe('flag');
    expect(m.actions[1]).toMatchObject({
      libelle: 'Signaler sans compte',
      cible: `/contact?motif=signalement&contenu=${encodeURIComponent(CONTEXTE.adresse)}`,
    });
  });

  it('donne les dates de la suspension et des nouvelles conditions', () => {
    expect(messageAcces('suspendu', 'voter', CONTEXTE).titre).toBe(
      'Votre compte est suspendu jusqu’au 2 novembre 2026',
    );
    expect(messageAcces('conditions', 'voter', CONTEXTE).texte).toBe(
      'Les conditions générales et la charte communautaire ont changé le 15 octobre 2026.',
    );
  });

  it('reste juste sans date connue', () => {
    const sansDates = { ...CONTEXTE, suspensionJusqua: null, conditionsDepuis: null };
    expect(messageAcces('suspendu', 'voter', sansDates).titre).toBe('Votre compte est suspendu');
    expect(messageAcces('conditions', 'voter', sansDates).texte).toBe(
      'Les conditions générales et la charte communautaire ont changé.',
    );
  });

  it('rappelle le niveau, les points et le seuil Expert (RG-84)', () => {
    expect(messageAcces('niveau', 'proposer un cas', CONTEXTE).texte).toBe(
      'Vous êtes Apprenti avec 182 points. Le niveau Expert commence à 1 500 points.',
    );
  });

  it('branche les boutons de renvoi et d’acceptation', () => {
    expect(messageAcces('email', 'voter', CONTEXTE).actions[0]).toMatchObject({
      genre: 'bouton',
      cible: 'email',
    });
    expect(messageAcces('conditions', 'voter', CONTEXTE).actions[0]).toMatchObject({
      genre: 'bouton',
      cible: 'conditions',
    });
  });
});

describe('rendu HTML', () => {
  it('écarte « Fermer » d’un bloc intégré à la page', () => {
    const { actions } = messageAcces('role', 'traiter ce signalement', CONTEXTE);
    expect(actionsAccesHtml(actions, false)).toContain('data-acces-fermer');
    expect(actionsAccesHtml(actions, true)).toBe('');
  });

  it('échappe le texte et les adresses', () => {
    const m = messageAcces('connexion', 'voter <b>ici</b>', { ...CONTEXTE, page: '/x?a="b"&c' });
    const html = blocAccesHtml(m, 'h1');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('<h1>');
    expect(html).toMatch(/href="\/inscription\?retour=%2Fx%3Fa%3D%22b%22%26c&amp;pour=/);
  });

  it('invite à créer un compte ou à se connecter', () => {
    expect(invitationHtml('connexion', 'suivre votre progression', CONTEXTE)).toBe(
      '<a href="/inscription?retour=%2Fforum%3Ftype%3Dquestion%23reponses&amp;pour=suivre%20votre%20progression">Créez un compte</a> ou <a href="/connexion?retour=%2Fforum%3Ftype%3Dquestion%23reponses&amp;pour=suivre%20votre%20progression">connectez-vous</a> pour suivre votre progression.',
    );
    expect(invitationHtml('suspendu', 'voter', CONTEXTE)).toBe(
      'Vous pourrez voter à la fin de la suspension, le 2 novembre 2026.',
    );
  });
});

describe('contexteServeur', () => {
  it('reprend la page, l’adresse publique et le membre', () => {
    const locals = {
      etat: { session: 'membre', role: 'membre', niveau: 'artisan', compte: 'actif' },
      membre: { id: 1, pseudo: 'aya', nom: 'aya', points: 640, avatar: null },
      nonLues: 0,
      suspensionJusqua: null,
      conditionsDepuis: null,
      deuxFacteurs: null,
    } satisfies App.Locals;
    const c = contexteServeur(
      locals,
      new URL('http://localhost:4321/forum?type=question'),
      new URL('https://vysora.fr'),
    );
    expect(c).toMatchObject({
      page: '/forum?type=question',
      adresse: 'https://vysora.fr/forum?type=question',
      niveau: 'artisan',
      points: 640,
    });
  });
});
