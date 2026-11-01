import type { TypeCreation, TypeMomentCle, TypeSujet } from '../enums';
import type { MembreResumeApi } from './creations';
import type { MediaApi } from './medias';
import type { OutilEtModelesApi, ResultatApercuApi } from './mes-contenus';

/* Compléments des savoirs d'Apprendre (APP-03) : moments clés de la communauté qui illustrent un
   savoir (« Vu dans la communauté ») et sujet du forum lié (« Pour aller plus loin »), choisis par
   l'équipe. Les savoirs sont des contenus éditoriaux du site, désignés par leur identifiant. */

/** Moment clé d'une création publiée, ou la création seule avec une note de l'équipe. */
export interface IllustrationSavoirApi {
  id: number;
  creation: {
    id: number;
    slug: string;
    titre: string;
    type: TypeCreation;
    couverture: MediaApi | null;
    /** À défaut d'image, le début du texte ou du code obtenu. */
    resultat: ResultatApercuApi | null;
    auteur: MembreResumeApi;
    /** Premier outil de la création et ses modèles (« Claude · Sonnet 4.5 »). */
    outil: OutilEtModelesApi | null;
  };
  moment: { id: number; type: TypeMomentCle; titre: string | null; texte: string } | null;
  note: string | null;
}

export interface SujetSavoirApi {
  id: number;
  slug: string;
  titre: string;
  typeSujet: TypeSujet;
  /** RG-63, RG-65 : réponse acceptée (résolu), fermé par l'auteur ou la modération. */
  etat: 'OUVERT' | 'RESOLU' | 'FERME';
}

/** GET /api/v1/savoirs/complements : par identifiant de savoir, ce qui est visible de tous (RG-30). */
export interface ComplementsSavoirsApi {
  illustrations: Record<string, IllustrationSavoirApi[]>;
  sujets: Record<string, SujetSavoirApi>;
}

/** Illustration telle que l'administration la suit : montrée, ou cachée et pourquoi. */
export interface IllustrationAdministreeApi extends IllustrationSavoirApi {
  /** La création n'est plus publiée et visible (RG-30), ou l'auteur l'a réécrite et le moment choisi
      n'existe plus (sans note, l'illustration n'a plus rien à montrer). */
  etat: 'MONTREE' | 'CREATION_INVISIBLE' | 'MOMENT_DISPARU';
}

export interface SujetSavoirAdministreApi extends SujetSavoirApi {
  /** Faux si le sujet n'est plus visible de tous (masqué, supprimé) : il n'est pas montré. */
  visible: boolean;
}

/** GET /api/v1/admin/savoirs */
export interface SavoirsAdministresApi {
  illustrations: Record<string, IllustrationAdministreeApi[]>;
  sujets: Record<string, SujetSavoirAdministreApi>;
}

/** GET /api/v1/admin/creations/:id/moments : moments clés d'une création publiée et visible, dans
    l'ordre du parcours. */
export interface MomentsCreationApi {
  creation: { id: number; slug: string; titre: string };
  moments: { id: number; type: TypeMomentCle; titre: string | null; texte: string }[];
}
