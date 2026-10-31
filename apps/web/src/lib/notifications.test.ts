import type { MembreResumeApi, NotificationApi } from '@vysora/shared';
import { describe, expect, it } from 'vitest';
import {
  aTraiter,
  categorieDe,
  contenuVise,
  courte,
  deNom,
  ecart,
  epinglee,
  lundi,
  quand,
  resume,
  texteNiveau,
  titreDetail,
  votantsTexte,
} from './notifications';

const membre = (nom: string): MembreResumeApi => ({
  id: nom.length,
  pseudo: nom.toLowerCase().replace(/\s+/g, '-'),
  nom,
  avatar: null,
  niveau: { code: 'expert', libelle: 'Expert' },
  reputation: 0,
});

const notification = (valeurs: Partial<NotificationApi> = {}): NotificationApi => ({
  id: 1,
  type: 'COMMENTAIRE_RECU',
  date: '2026-10-13T10:05:00.000Z',
  lue: false,
  nombre: 1,
  par: membre('Kofi Mensah'),
  votants: [],
  disponible: true,
  cible: {
    nature: 'CREATION',
    id: 12,
    slug: 'affiche-ziguinchor',
    titre: 'Affiche touristique de Ziguinchor',
    aMoi: true,
    typeCreation: 'ITERATION',
    categorie: 'Image et illustration',
    auteur: null,
    datePublication: '2026-10-12T09:12:00.000Z',
    image: null,
    typeSujet: null,
  },
  surReponse: false,
  texte: 'Vous avez imposé la police du titre dès le premier prompt ?',
  origine: null,
  reponse: null,
  repondreA: { creationId: 12, commentaireId: 40 },
  repondreSujet: null,
  points: null,
  reproduction: null,
  variante: null,
  badge: null,
  niveau: null,
  defi: null,
  motif: null,
  decision: null,
  obsolescence: null,
  acceptee: false,
  sujetResolu: false,
  ...valeurs,
});

describe('Textes des notifications (prototype : titreDetail, resume)', () => {
  it('nomme qui a fait quoi et sur quel contenu', () => {
    const n = notification();
    expect(titreDetail(n)).toBe('Kofi Mensah a commenté votre création');
    expect(resume(n)).toBe('Kofi Mensah a commenté « Affiche touristique de Ziguinchor »');
    const sujet = notification({
      type: 'REPONSE_SUJET',
      cible: { ...notification().cible!, nature: 'SUJET', typeSujet: 'CLINIQUE' },
    });
    expect(titreDetail(sujet)).toBe('Kofi Mensah a répondu à votre clinique du prompt');
  });

  it('regroupe les votants « Utile » (RG-91)', () => {
    expect(votantsTexte(['Léa Martin'])).toBe('Léa Martin a voté');
    expect(votantsTexte(['Léa Martin', 'Awa Sarr'])).toBe('Léa Martin et Awa Sarr ont voté');
    expect(votantsTexte(['Moussa Diallo', 'Kofi Mensah'], 3)).toBe(
      'Moussa Diallo, Kofi Mensah et 1 autre membre ont voté',
    );
    const votes = notification({
      type: 'VOTES_UTILE_RECUS',
      nombre: 2,
      votants: [membre('Léa Martin'), membre('Awa Sarr')],
      surReponse: true,
    });
    expect(titreDetail(votes)).toBe('Léa Martin et Awa Sarr ont voté « Utile »');
    expect(resume(votes)).toBe('2 membres ont voté « Utile » pour votre réponse');
  });

  it('présente un contenu qui n’est plus disponible sans en citer le titre', () => {
    const n = notification({ disponible: false, cible: null, texte: null });
    expect(resume(n)).toBe('Kofi Mensah a commenté « Contenu qui n’est plus disponible »');
  });

  it('dit ce que change le niveau atteint (RG-85)', () => {
    expect(texteNiveau('apprenti')).toBe(
      'Vous pouvez publier 10 créations et 10 sujets par jour, et vos signalements comptent désormais pour le masquage automatique.',
    );
    // Séparateur de milliers : espace fine insécable (fmt).
    expect(texteNiveau('artisan')).toContain('Prochain palier : Expert, à 1 500 points.');
  });

  it('accorde « de » devant un prénom', () => {
    expect(deNom('Aïssatou Ndiaye')).toBe('d’Aïssatou Ndiaye');
    expect(deNom('Julien Moreau')).toBe('de Julien Moreau');
  });
});

describe('Ce qui reste « À traiter »', () => {
  it('une question posée dans un commentaire, tant qu’on n’y a pas répondu', () => {
    expect(aTraiter(notification())).toBe(true);
    expect(aTraiter(notification({ texte: 'Merci pour ce détail.' }))).toBe(false);
    expect(
      aTraiter(
        notification({
          reponse: { auteur: null, moi: true, texte: 'Oui.', date: '2026-10-13T11:00:00Z' },
        }),
      ),
    ).toBe(false);
    // Plus de réponse possible (création dépubliée) : rien à traiter ici.
    expect(aTraiter(notification({ repondreA: null }))).toBe(false);
  });

  it('une réponse à un sujet non résolu, une alerte sur une création', () => {
    expect(aTraiter(notification({ type: 'REPONSE_SUJET', sujetResolu: false }))).toBe(true);
    expect(aTraiter(notification({ type: 'REPONSE_SUJET', sujetResolu: true }))).toBe(false);
    expect(aTraiter(notification({ type: 'CONTENU_MASQUE' }))).toBe(true);
    expect(aTraiter(notification({ type: 'CONTENU_MASQUE', disponible: false }))).toBe(false);
  });

  it('épingle une suspension, range chaque type dans sa catégorie', () => {
    const suspension = notification({
      type: 'DECISION_MODERATION',
      decision: { action: 'SUSPENDRE', finSuspension: '2026-10-20T00:00:00Z', contenu: null },
    });
    expect(epinglee(suspension)).toBe(true);
    expect(titreDetail(suspension)).toBe('Votre compte est suspendu jusqu’au 20 octobre 2026');
    expect(categorieDe('REPRODUCTION_RECUE')).toBe('preuves');
    expect(categorieDe('NIVEAU_ATTEINT')).toBe('progression');
  });

  it('annonce les décisions des administrateurs sur le membre (ADM-02)', () => {
    const ajustement = notification({
      type: 'DECISION_MODERATION',
      points: -30,
      decision: { action: 'AJUSTER_REPUTATION', finSuspension: null, contenu: null },
    });
    expect(titreDetail(ajustement)).toBe('Votre réputation a été corrigée');
    expect(epinglee(ajustement)).toBe(false);
    const retrait = notification({
      type: 'DECISION_MODERATION',
      badge: {
        code: 'PODIUM',
        libelle: 'Podium',
        critere: 'Finir sur le podium d’un défi',
        categorie: 'COMMUNAUTE',
        icone: 'podium',
        ton: 'AMBRE',
      },
      decision: { action: 'RETIRER_BADGE', finSuspension: null, contenu: null },
    });
    expect(resume(retrait)).toBe('le badge « Podium » vous a été retiré');
  });

  it('nomme le contenu visé par la modération, accordé à son type (MOD-01)', () => {
    const decision = (
      type: NotificationApi['type'],
      action: 'MASQUER' | 'RETABLIR' | 'SUPPRIMER' | 'AJOUTER_AVERTISSEMENT_AGENT',
      contenu: { type: 'CREATION' | 'MESSAGE' | 'COMMENTAIRE'; intitule: string } | null,
    ) => notification({ type, par: null, decision: { action, finSuspension: null, contenu } });
    const reponse = { type: 'MESSAGE', intitule: 'Demandez une exécution à blanc.' } as const;
    expect(titreDetail(decision('CONTENU_MASQUE', 'MASQUER', reponse))).toBe(
      'Votre réponse a été masquée par la modération',
    );
    expect(resume(decision('CONTENU_MASQUE', 'MASQUER', reponse))).toBe(
      '« Demandez une exécution à blanc. » a été masquée par la modération',
    );
    const commentaire = { type: 'COMMENTAIRE', intitule: 'Merci pour le prompt' } as const;
    expect(titreDetail(decision('CONTENU_RETABLI', 'RETABLIR', commentaire))).toBe(
      'Votre commentaire est de nouveau visible',
    );
    expect(titreDetail(decision('DECISION_MODERATION', 'SUPPRIMER', commentaire))).toBe(
      'Votre commentaire a été supprimé par la modération',
    );
    expect(
      resume(
        decision('DECISION_MODERATION', 'AJOUTER_AVERTISSEMENT_AGENT', {
          type: 'CREATION',
          intitule: 'Renommer des photos',
        }),
      ),
    ).toBe('un avertissement a été ajouté à votre création');
    // Sans contenu connu (notification du prototype) : la création et son titre.
    expect(titreDetail(decision('CONTENU_MASQUE', 'MASQUER', null))).toBe(
      'Votre création a été masquée par la modération',
    );
    expect(contenuVise(decision('CONTENU_MASQUE', 'MASQUER', null)).intitule).toBe(
      'Affiche touristique de Ziguinchor',
    );
  });
});

describe('Dates des notifications (UTC)', () => {
  const maintenant = new Date('2026-10-13T10:30:00Z');

  it('dates relatives de la liste et du volet', () => {
    expect(quand('2026-10-13T10:25:00Z', maintenant)).toBe('il y a 5 min');
    expect(quand('2026-10-13T08:40:00Z', maintenant)).toBe('aujourd’hui à 8 h 40');
    expect(quand('2026-10-12T20:15:00Z', maintenant)).toBe('hier à 20 h 15');
    expect(quand('2026-10-09T17:50:00Z', maintenant)).toBe('le 9 oct. à 17 h 50');
    expect(courte('2026-10-13T10:05:00Z', maintenant)).toBe('25 min');
    expect(courte('2026-10-12T20:15:00Z', maintenant)).toBe('20 h 15');
    expect(courte('2026-10-10T09:40:00Z', maintenant)).toBe('sam. 10');
    expect(courte('2026-09-28T19:40:00Z', maintenant)).toBe('28 sept.');
  });

  it('compte les jours écoulés et la semaine du classement (RG-87)', () => {
    expect(ecart('2026-10-12T23:59:00Z', maintenant)).toBe(1);
    expect(ecart('2026-10-13T00:01:00Z', maintenant)).toBe(0);
    expect(lundi(maintenant).toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });
});
