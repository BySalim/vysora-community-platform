import { MOTIFS } from './donnees';
import type { OutilEditeur } from './modele';

/* Import d'une conversation copiée (prototype/nouvelle-creation.js : decouper, reconnaitre) :
   le texte est découpé en prompts d'après les mentions placées en début de ligne (« Vous : »,
   « ChatGPT a dit : »…), avec des motifs prédéfinis, sans appel à un modèle (C-02). L'outil et le
   modèle cités sont reconnus dans le catalogue de l'API. */

export interface EchangeImporte {
  prompt: string;
  reponse: string;
  outilId: number | null;
}

export interface ConversationImportee {
  echanges: EchangeImporte[];
  /** Texte collé sans aucune mention : un seul prompt. */
  sansMarqueur: boolean;
  reglages: string;
  outilId: number | null;
  modele: string;
}

const echapper = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function creerImport(outils: OutilEditeur[]) {
  const parNom = (nom: string | null | undefined) =>
    nom ? (outils.find((o) => o.nom.toLowerCase() === nom.toLowerCase()) ?? null) : null;
  const modeles = outils
    .flatMap((outil) =>
      outil.modeles.map((m) => ({
        outil,
        modele: m.nomCourt,
        re: new RegExp(`(^|[^\\w])${echapper(m.nomCourt)}(?!\\w|\\.\\d)`, 'i'),
      })),
    )
    .toSorted((a, b) => b.modele.length - a.modele.length);
  const alias = outils.flatMap((outil) =>
    outil.alias.map((a) => ({ outil, re: new RegExp(`(^|[^\\w])${echapper(a)}(?![\\w])`, 'i') })),
  );

  /** Outil et modèle cités : interlocuteur, nom du modèle, alias, paramètre Midjourney. */
  function reconnaitre(
    texte: string,
    outilConnu: OutilEditeur | null,
  ): { outil: OutilEditeur | null; modele: string } {
    let outil = outilConnu;
    let modele = '';
    const v = texte.match(/--v\s+([\d.]+)/i);
    const niji = texte.match(/--niji\s+(\d+)/i);
    if (outil?.nom === 'Midjourney' || v || niji) {
      outil = outil ?? parNom('Midjourney');
      if (niji) modele = `Niji ${niji[1]}`;
      else if (v) modele = `v${v[1]}`;
    }
    if (!modele) {
      const candidats = modeles.filter((m) => m.re.test(texte));
      const choix =
        candidats.find((m) => m.outil.id === outil?.id) ?? (outil ? undefined : candidats[0]);
      if (choix) {
        modele = choix.modele;
        outil = outil ?? choix.outil;
      }
    }
    if (!outil) outil = alias.find((a) => a.re.test(texte))?.outil ?? null;
    if (!outil)
      outil =
        outils.find((o) => new RegExp(`(^|[^\\w])${echapper(o.nom)}(?![\\w])`).test(texte)) ?? null;
    return { outil, modele };
  }

  /** Découpe une conversation collée en prompts, chacun avec la réponse qui le suit. */
  function decouper(texte: string): ConversationImportee {
    const lignes = texte.replace(/\r\n?/g, '\n').split('\n');
    const blocs: { role: 'user' | 'ai'; outil: OutilEditeur | null; lignes: string[] }[] = [];
    let bloc: (typeof blocs)[number] | null = null;
    let marques = 0;
    const ouvrir = (role: 'user' | 'ai', outil: OutilEditeur | null, debut: string) => {
      bloc = { role, outil, lignes: debut ? [debut] : [] };
      blocs.push(bloc);
      return bloc;
    };
    for (const ligne of lignes) {
      let m = ligne.match(MOTIFS.midjourney);
      if (m) {
        marques += 1;
        ouvrir('user', parNom('Midjourney'), m[1] ?? '');
        continue;
      }
      m = ligne.match(MOTIFS.utilisateur);
      if (m) {
        marques += 1;
        ouvrir('user', null, m[1] ?? '');
        continue;
      }
      m = ligne.match(MOTIFS.assistant);
      if (m) {
        marques += 1;
        ouvrir('ai', parNom(MOTIFS.libelles[(m[1] ?? '').toLowerCase()]), m[2] ?? '');
        continue;
      }
      if (MOTIFS.image.test(ligne)) continue;
      const courant: (typeof blocs)[number] = bloc ?? ouvrir('user', null, '');
      courant.lignes.push(ligne);
    }
    const echanges: { prompt: string; reponse: string; outil: OutilEditeur | null }[] = [];
    if (!marques) {
      const seul = texte.trim();
      if (seul) echanges.push({ prompt: seul, reponse: '', outil: null });
    } else {
      for (const b of blocs) {
        const contenu = b.lignes
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (b.role === 'user') {
          echanges.push({ prompt: contenu, reponse: '', outil: b.outil });
          continue;
        }
        if (!echanges.length) echanges.push({ prompt: '', reponse: '', outil: null });
        const dernier = echanges[echanges.length - 1];
        if (!dernier) continue;
        dernier.reponse = dernier.reponse ? `${dernier.reponse}\n\n${contenu}` : contenu;
        if (b.outil) dernier.outil = b.outil;
      }
    }
    const textePrompts = echanges.map((e) => e.prompt).join('\n');
    const reglages = [
      ...new Set(
        MOTIFS.reglages
          .flatMap((re) => textePrompts.match(new RegExp(re.source, re.flags)) ?? [])
          .map((s) => s.trim()),
      ),
    ];
    const reconnu = reconnaitre(texte, echanges.map((e) => e.outil).find(Boolean) ?? null);
    return {
      echanges: echanges.map((e) => ({
        prompt: e.prompt,
        reponse: e.reponse,
        outilId: e.outil?.id ?? null,
      })),
      sansMarqueur: !marques && echanges.length > 0,
      reglages: reglages.join(' '),
      outilId: reconnu.outil?.id ?? null,
      modele: reconnu.modele,
    };
  }

  return { decouper, reconnaitre };
}
