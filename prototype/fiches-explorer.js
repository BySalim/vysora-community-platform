'use strict';

/* Rend consultables sur la fiche création les créations ajoutées au catalogue d'Explorer. */
(() => {
  const D = window.VYSORA_DATA;
  const X = window.VYSORA_EXPLORER;
  const details = window.VYSORA_CREATION_DETAILS;
  if (!D || !X || !details) return;

  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const published = iso => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const HEADINGS = {
    Vérification: 'Vérifier le résultat avant de continuer',
    Refus: 'Refuser une proposition de l’IA',
    Correction: 'Corriger la demande',
    Découverte: 'Une découverte en cours de route',
    Échec: 'Comprendre un échec'
  };
  const known = new Set(D.creations.map(c => c.id));

  X.creations.filter(c => !known.has(c.id)).forEach(c => {
    const moments = c.moments.length;
    const length = c.type === 'projet' ? c.steps.length : c.type === 'iteration' ? c.exchanges : 1;
    const marks = Array.from({ length }, (_, i) => (i >= length - moments ? 1 : 0));
    const config = c.tools.map(([tool, model]) => (model ? `${tool} · ${model}` : tool)).join(' et ') + (c.extra ? ` et ${c.extra}` : '');
    D.creations.push({
      id: c.id, title: c.title, type: c.type, category: c.category, author: c.author, level: X.levels[c.author] || 'Membre',
      config, media: c.media, steps: marks, useful: c.useful, week: c.week, repro: c.type === 'projet' ? null : c.repro, success: c.success, published: published(c.date)
    });
    const first = c.moments[0];
    details[c.id] = {
      intent: c.objective,
      prompt: c.prompt || c.steps[0],
      kind: first ? first.type : 'Vérification',
      moment: first ? HEADINGS[first.type] || first.type : 'Vérifier le résultat avant de le publier',
      note: first ? first.text : 'Le résultat a été relu et vérifié avant la publication.',
      adapt: ['Votre objectif et votre public', 'Les informations propres à votre projet', 'Le ton et le niveau de détail attendus'],
      steps: c.type === 'projet' ? c.steps.map((name, i) => [name, `${name}.`, (c.moments[i] && c.moments[i].text) || 'Résultat vérifié avant de passer à l’étape suivante.']) : undefined,
      context: c.type === 'projet' ? 'Plusieurs outils, une étape après l’autre' : c.type === 'iteration' ? 'Même conversation pour tous les échanges' : 'Une seule demande',
      format: c.category
    };
  });

  // Fil d'Ariane et retour : domaine et guide de la création.
  function linkToGuide() {
    const id = new URLSearchParams(location.search).get('id') || 'cite-ciel-mer';
    const c = X.creations.find(item => item.id === id);
    if (!c) return;
    const domain = X.domains.find(d => d.name === c.domain);
    const guide = X.objectives.find(o => o.id === c.goal);
    const crumbs = document.querySelector('.breadcrumbs');
    const text = value => (window.Vysora ? window.Vysora.t(value) : value);
    const esc = value => (window.Vysora ? window.Vysora.esc(value) : value);
    if (crumbs && domain) {
      crumbs.innerHTML = `<a href="explorer.html">Explorer</a><span aria-hidden="true">/</span><a href="categorie.html?domaine=${domain.slug}">${esc(text(domain.name))}</a>${guide ? `<span aria-hidden="true">/</span><a href="explorer.html?guide=${guide.id}">${esc(text(guide.short))}</a>` : ''}`;
    }
    const back = document.querySelector('.creation-bottom a[href="explorer.html"]');
    if (back && guide) {
      back.href = `explorer.html?guide=${guide.id}#parcours-${c.id}`;
      back.lastChild.textContent = ` Retour au guide « ${text(guide.short)} »`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Vysora) return;
    linkToGuide();
    document.querySelectorAll('.creation-preview').forEach(preview => {
      const kind = [...preview.classList].find(name => name.startsWith('preview-'))?.slice(8);
      if (kind && !preview.children.length) preview.innerHTML = window.Vysora.mockHTML(kind);
    });
  });
})();
