/** Partie lisible d'une adresse : minuscules, sans accents, mots séparés par des tirets. */
export function slugifier(texte: string, longueurMax = 80): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, longueurMax)
    .replace(/-+$/g, '');
}

/** Durée avant une échéance, sans heure ni fuseau (RG-85) : « dans 5 h 12 min », « dans 40 min »,
    « dans moins d’une minute » (espaces insécables avant les unités). */
export function dansLeDelai(secondes: number): string {
  const minutes = Math.ceil(secondes / 60);
  if (minutes <= 1) return 'dans moins d’une minute';
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (!heures) return `dans ${reste} min`;
  return reste ? `dans ${heures} h ${reste} min` : `dans ${heures} h`;
}
