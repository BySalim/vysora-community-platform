/* Mise en forme commune des e-mails : texte brut toujours fourni, version HTML sobre aux couleurs de la charte. */

const echapper = (valeur: string) =>
  valeur.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

export interface ContenuEmail {
  titre: string;
  paragraphes: string[];
  /** Lignes « libellé : valeur » présentées en tableau. */
  details?: [string, string][];
  /** Bouton (lien d'action) placé après le premier paragraphe ; l'adresse figure aussi en clair. */
  action?: { libelle: string; url: string };
}

export function miseEnForme({ titre, paragraphes, details = [], action }: ContenuEmail): {
  texte: string;
  html: string;
} {
  const [premier, ...suite] = paragraphes;
  const texte = [
    titre,
    '',
    ...(premier === undefined ? [] : [premier, '']),
    ...(action ? [`${action.libelle} : ${action.url}`, ''] : []),
    ...suite.flatMap((p) => [p, '']),
    ...details.map(([libelle, valeur]) => `${libelle} : ${valeur}`),
    '',
    '— Vysora',
  ].join('\n');

  const lignes = details
    .map(
      ([libelle, valeur]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#737373;vertical-align:top">${echapper(libelle)}</td><td style="padding:6px 0;color:#171717;white-space:pre-wrap">${echapper(valeur)}</td></tr>`,
    )
    .join('');
  const paragraphe = (p: string) =>
    `<p style="margin:0 0 14px;color:#171717;font-size:15px;line-height:1.6">${echapper(p)}</p>`;
  const bouton = action
    ? `<p style="margin:22px 0"><a href="${echapper(action.url)}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${echapper(action.libelle)}</a></p><p style="margin:0 0 14px;color:#737373;font-size:13px;line-height:1.5;word-break:break-all">${echapper(action.url)}</p>`
    : '';
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F5F5;font-family:Montserrat,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 24px;color:#2563EB;font-weight:700;font-size:18px">Vysora</p>
<div style="background:#FFFFFF;border-radius:12px;padding:28px">
<h1 style="margin:0 0 16px;color:#000000;font-size:20px;line-height:1.3">${echapper(titre)}</h1>
${premier === undefined ? '' : paragraphe(premier)}${bouton}${suite.map(paragraphe).join('')}
${lignes ? `<table style="margin-top:8px;font-size:14px;line-height:1.5;border-collapse:collapse">${lignes}</table>` : ''}
</div>
<p style="margin:20px 0 0;color:#737373;font-size:12px">Voir comment l’IA crée. Apprendre à créer avec elle.</p>
</div></body></html>`;
  return { texte, html };
}
