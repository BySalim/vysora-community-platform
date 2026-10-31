import { emailDecision, emailDecisionMembre, type DecisionACommuniquer } from './courriels.js';

const base: DecisionACommuniquer = {
  a: 'lea@example.com',
  id: 12,
  action: 'MASQUER',
  motif: 'Une capture laisse lire un numéro de téléphone.',
  finSuspension: null,
  fuseau: 'Africa/Dakar',
  contenu: { type: 'CREATION', intitule: 'Cité imaginaire' },
  creation: {
    fiche: 'https://vysora.example/creations/4-cite-imaginaire',
    modifier: 'https://vysora.example/creations/4/modifier',
  },
  contestation: 'https://vysora.example/contact?motif=contestation',
};

/** Texte de l'e-mail, espaces insécables lues comme des espaces. */
const lire = (email: { sujet: string; texte: string }) => ({
  sujet: email.sujet.replace(/[  ]/g, ' '),
  texte: email.texte.replace(/[  ]/g, ' '),
});

describe('emailDecision (F-92)', () => {
  it('donne la mesure, le motif, la référence et la façon de contester', () => {
    const html = emailDecision(base).html;
    const email = lire(emailDecision(base));
    expect(email.sujet).toBe('Votre création a été masquée par la modération');
    expect(email.texte).toContain('« Cité imaginaire » n’est plus visible des autres membres.');
    expect(email.texte).toContain('Motif : Une capture laisse lire un numéro de téléphone.');
    expect(email.texte).toContain('Référence : Décision n° 12');
    expect(email.texte).toContain(
      'Modifier la création : https://vysora.example/creations/4/modifier',
    );
    expect(email.texte).toContain('sans outil automatisé');
    expect(html).toContain('Contester une décision');
  });

  it('accorde le contenu visé et propose de contester une suppression', () => {
    const email = lire(
      emailDecision({
        ...base,
        action: 'SUPPRIMER',
        contenu: { type: 'COMMENTAIRE', intitule: 'Le prompt ne marche pas.' },
        creation: null,
      }),
    );
    expect(email.sujet).toBe('Votre commentaire a été supprimé par la modération');
    expect(email.texte).toContain(
      'Contester la décision : https://vysora.example/contact?motif=contestation',
    );
  });

  it('date la fin d’une suspension dans le fuseau du membre (RG-103)', () => {
    const email = lire(
      emailDecision({
        ...base,
        action: 'SUSPENDRE',
        finSuspension: new Date('2026-11-01T23:30:00Z'),
        fuseau: 'Europe/Paris',
      }),
    );
    expect(email.sujet).toBe('Votre compte est suspendu jusqu’au 2 novembre 2026');
    expect(email.texte).toContain('redeviendront possibles le 2 novembre 2026 à 00 h 30.');
    expect(email.texte).toContain('Fin de la suspension : 2 novembre 2026 à 00 h 30');
  });
});

describe('emailDecisionMembre (F-92, RG-102)', () => {
  const decision = {
    a: 'lea@example.com',
    id: 30,
    motif: 'Votes croisés avec trois comptes.',
    points: null,
    badge: null,
    contestation: 'https://vysora.example/contact?motif=contestation',
  };

  it('annonce la fermeture du compte et la façon de la contester', () => {
    const email = lire(emailDecisionMembre({ ...decision, action: 'BANNIR' }));
    expect(email.sujet).toBe('Votre compte Vysora est fermé');
    expect(email.texte).toContain('vous ne pouvez plus vous connecter à Vysora');
    expect(email.texte).toContain('Motif : Votes croisés avec trois comptes.');
    expect(email.texte).toContain('Référence : Décision n° 30');
    expect(email.texte).toContain(
      'Contester la décision : https://vysora.example/contact?motif=contestation',
    );
  });

  it('donne les points retirés ou ajoutés ; seul un retrait se conteste', () => {
    const retrait = lire(
      emailDecisionMembre({ ...decision, action: 'AJUSTER_REPUTATION', points: -1200 }),
    );
    expect(retrait.sujet).toBe('Votre réputation a été corrigée');
    expect(retrait.texte).toContain('a retiré 1 200 points de votre réputation');
    expect(retrait.texte).toContain('Points : −1 200');
    expect(retrait.texte).toContain('Contester la décision');
    const ajout = lire(
      emailDecisionMembre({ ...decision, action: 'AJUSTER_REPUTATION', points: 1 }),
    );
    expect(ajout.texte).toContain('a ajouté 1 point à votre réputation');
    expect(ajout.texte).toContain('Points : +1');
    expect(ajout.texte).not.toContain('Contester la décision :');
  });

  it('nomme le badge retiré', () => {
    const email = lire(
      emailDecisionMembre({ ...decision, action: 'RETIRER_BADGE', badge: 'Podium' }),
    );
    expect(email.sujet).toBe('Le badge « Podium » vous a été retiré');
    expect(email.texte).toContain('Il ne vous sera plus attribué.');
  });
});
