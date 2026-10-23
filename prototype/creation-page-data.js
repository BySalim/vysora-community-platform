'use strict';
(() => {
  function mockHTML(kind) {
    switch (kind) {
      case 'booking':
        return `<div class="mock-window"><div class="mock-bar"><i></i>Keur Awa<small>Coiffure</small></div><div class="mock-pad"><p class="mock-label">Dimanche 18 octobre</p><div class="mock-slots"><span>09:00</span><span class="off">10:30</span><span class="on">12:00</span><span>14:00</span><span class="off">15:30</span><span>17:00</span></div><div class="mock-btn">Confirmer le rendez-vous</div></div></div>`;
      case 'dashboard':
        return `<div class="mock-window"><div class="mock-bar"><i></i>Ventes<small>Juin à septembre</small></div><div class="mock-pad"><div class="mock-kpis"><span>Chiffre d’affaires<b>4,2 M</b></span><span>Commandes<b>1 318</b></span><span>Retours<b>2,4 %</b></span></div><div class="mock-chart">${[38, 52, 46, 61, 57, 72, 66, 88, 79].map((h, i) => `<i${i === 7 ? ' class="hi"' : ''} style="--h:${h}%"></i>`).join('')}</div></div></div>`;
      case 'flow':
        return `<div class="mock-flow"><div class="mock-node"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-mail"/></svg></span>Messagerie<small>Libellé Factures</small></div><span class="mock-link"></span><div class="mock-node is-key"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-scan"/></svg></span>Extraction<small>Montant TTC</small></div><span class="mock-link"></span><div class="mock-node"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span>Classement<small>Par mois</small></div></div>`;
      case 'letter':
        return `<div class="mock-paper"><p>Madame, Monsieur,</p><p><del>Passionné et dynamique, je souhaite</del> <ins>J’ai organisé 14 ateliers de prévention</ins> dans trois quartiers d’Abidjan.</p><div class="mock-lines"><i style="width:94%"></i><i style="width:86%"></i><i style="width:58%"></i></div></div>`;
      case 'code':
        return `<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>renommer_photos.py</span></div><pre><span class="k">for</span> photo <span class="k">in</span> dossier.glob(<span class="s">"*.jpg"</span>):
    date = <span class="f">lire_date</span>(photo)
    nom = date.strftime(<span class="s">"%Y-%m-%d_%H%M%S"</span>)
    <span class="k">if</span> simulation:
        <span class="f">print</span>(photo.name, <span class="s">"→"</span>, nom)
<span class="c"># 248 photos, aucun fichier modifié</span></pre></div>`;
      case 'cards':
        return `<div class="mock-cards"><span></span><span></span><span><em>Photosynthèse</em><b>Quels sont les réactifs de la photosynthèse ?</b><small>Fiche 3 sur 12</small></span></div>`;
      case 'logo':
        return `<div class="mock-logo"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 18c9 0 16 8.5 16 19S41 56 32 56 16 47.5 16 37s7-19 16-19Z" fill="#171717"/><path d="M33 19c1.5-8 9-12.5 17-11-1 8-8 12.5-17 11Z" fill="#2563EB"/><path d="M25 33c1.5-4 4.5-6.5 9-7.5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg><b>Karité de Koutiala</b><small>Coopérative</small></div>`;
      default:
        return '';
    }
  }

const D=window.VYSORA_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const requested=new URLSearchParams(location.search).get('id')||'cite-ciel-mer';
const c=D.creations.find(c=>c.id===requested);
if(!c){window.VYSORA_CURRENT_CREATION=null;$('.creation-shell').innerHTML='<section class="detail-section"><h1>Création introuvable</h1><p>Cette création n’est pas disponible.</p><a class="btn btn-primary" href="explorer.html">Retour à Explorer</a></section>';document.title='Création introuvable · Vysora';return;}
window.VYSORA_CURRENT_CREATION=c;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const toolHTML=config=>{let text=esc(config);const tools=D.tools.filter(t=>config.includes(t.name)).sort((a,b)=>b.name.length-a.name.length);for(const t of tools)text=text.replace(esc(t.name),`<span class="detail-tool-name"><img src="assets/logos-ia/${t.logo}.svg" alt="" width="24" height="24">${esc(t.name)}</span>`);return `<span class="ai-tool">${text}</span>`;};
window.VYSORA_TOOL_HTML=toolHTML;
if(c.id==='cite-ciel-mer')return;
const d=window.VYSORA_CREATION_DETAILS[c.id],isProject=c.type==='projet',own=!!c.own,V=window.Vysora;
document.title=c.title+' · Vysora';$('meta[name="description"]').content=d.intent;
$('.creation-heading h1').textContent=c.title;
const cat=$('.breadcrumbs a:nth-of-type(2)');cat.textContent=c.category;cat.href='explorer.html?categorie='+encodeURIComponent(c.category);
if(own&&V)$('.author img').outerHTML=V.avatarMoi(44);else $('.author img').src=`assets/avatars/${D.avatars[c.author]}.webp`;
$('.author strong').textContent=c.author;$('.author strong+span').textContent=c.level+' · Publié '+(c.published.includes('il y a')?c.published:'le '+c.published+' 2026');
const types={prompt:'1 prompt',iteration:'Itération',projet:'Projet'};const icons={'Application web':'browser','Code et scripts':'code','Texte et rédaction':'pen','Image et illustration':'image','Image':'image','Illustration':'image','Analyse de données':'chart','Automatisation':'flow','Texte':'pen','Code':'code','Éducation':'school','Vidéo':'film','Identité visuelle':'shapes'};
$$('.meta-type')[0].innerHTML=icon('type-'+c.type)+' '+types[c.type];$$('.meta-type')[1].innerHTML=icon(icons[c.category]||'image')+' '+esc(c.category);
const figure=$('.hero-figure'),open=$('.image-open');open.setAttribute('aria-label','Agrandir le résultat : '+c.title);
if(c.media.kind==='image'){
const img=open.querySelector('img');if(c.media.src){img.src=c.media.src;img.removeAttribute('srcset');if(c.media.portrait){img.style.objectFit='contain';img.style.background='var(--panel)';}}else{img.src=`assets/images/${c.media.name}-1280.webp`;img.srcset=`assets/images/${c.media.name}-720.webp 720w, assets/images/${c.media.name}-1280.webp 1280w`;}img.alt=c.media.alt;
$('#lightbox>img').src=img.src;$('#lightbox>img').alt=c.media.alt;
}else{
let content=['lien','vide'].includes(c.media.mock)?`<div class="mock-window"><div class="mock-bar"><i></i>${esc((c.media.url||'').replace(/^https:\/\//,'')||'Résultat')}</div><div class="mock-pad"><p class="mock-label">${esc(c.title)}</p>${c.media.url?'<div class="mock-btn">Ouvrir la démo</div>':''}</div></div>`:mockHTML(c.media.mock);
if(c.media.mock==='code-auteur')content=`<div class="mock-code"><div class="mock-bar"><i></i><i></i><i></i><span>${esc(c.media.nom||'Code')}</span></div><pre>${esc(String(c.media.texte||'').slice(0,1600))}</pre></div>`;
if(c.media.mock==='texte-auteur')content=`<div class="mock-paper">${String(c.media.texte||'').slice(0,1600).split(/\n{2,}/).map(p=>`<p>${esc(p)}</p>`).join('')}</div>`;
if(c.media.mock==='fichier-auteur')content=`<div class="mock-window"><div class="mock-bar"><i></i>${esc(c.media.nom||'Fichier')}</div><div class="mock-pad"><p class="mock-label">${esc(c.title)}</p></div></div>`;
if(c.media.mock==='dashboard')content='<div class="result-dashboard"><p>Boutique · Juin à septembre</p><h3>Suivi des ventes</h3><div class="dashboard-metrics"><span>Chiffre d’affaires net<strong>4,2 M FCFA</strong></span><span>Commandes<strong>1 318</strong></span><span>Taux de retour<strong>2,4 %</strong></span></div><table><thead><tr><th>Mois</th><th>Ventes nettes</th><th>Commandes</th></tr></thead><tbody><tr><td>Juin</td><td>850 000 FCFA</td><td>274</td></tr><tr><td>Juillet</td><td>980 000 FCFA</td><td>305</td></tr><tr><td>Août</td><td>1 120 000 FCFA</td><td>349</td></tr><tr><td>Septembre</td><td>1 250 000 FCFA</td><td>390</td></tr></tbody></table></div>';
open.innerHTML=`<div class="creation-preview preview-${c.media.mock}" role="img" aria-label="${esc(c.media.alt)}">${content}</div><span class="expand-icon">${icon('scan')}</span>`;
$('#lightbox>img').outerHTML=`<div class="creation-preview preview-${c.media.mock}" role="img" aria-label="${esc(c.media.alt)}">${content}</div>`;
}
$('#lightbox').setAttribute('aria-label',c.title+' en grand format');
figure.querySelector('figcaption').innerHTML=esc(d.format)+` <span>${c.media.kind==='image'?(c.category==='Vidéo'?'Extrait du projet':'Image générée avec l’IA'):'Résultat du parcours'}</span>`;
$('.reproduce h2').textContent=isProject?'Comprendre le projet':'Pour reproduire';
$('.reproduce>.ai-tool').outerHTML=toolHTML(c.config);
const moments=c.steps.filter(Boolean).length;
$('.reproduce .config-list').innerHTML=`<div><dt>${icon(icons[c.category]||'image')} Format</dt><dd>${esc(d.format)}</dd></div><div><dt>${icon('moment')} Moments clés</dt><dd>${moments}</dd></div><div><dt>${icon('layers')} Parcours</dt><dd>${c.steps.length} ${c.steps.length>1?'étapes':'étape'}</dd></div>`;
$('#parcours .intro').textContent='« '+d.intent+' »';$('.small-author').innerHTML=(own&&V?V.avatarMoi(28):`<img src="assets/avatars/${D.avatars[c.author]}.webp" alt="" width="28" height="28">`)+esc(c.author);
$('#prompt-text').textContent=d.prompt;
$('.key-moment span').textContent=d.kind;$('.key-moment h4').textContent=d.moment;$('.key-moment p').textContent=d.note;
if(d.moments&&d.moments.length>1){const km=$('.key-moment');km.previousElementSibling.textContent='Les moments clés';km.outerHTML=d.moments.map(m=>`<div class="key-moment">${icon('moment')}<div><span>${esc(m.kind)} · ${esc(m.ou)}</span><h4>${esc(m.titre)}</h4><p>${esc(m.note)}</p></div></div>`).join('');}
const steps=d.steps||[['Le prompt et le résultat',d.prompt,d.note]];
$('.process-details').outerHTML=`<div class="creation-steps"><h3>${isProject?'Les étapes du projet':c.type==='iteration'?'Les échanges':'Le résultat obtenu'}</h3>${steps.map((step,i)=>`<details class="process-details"><summary>${esc(step[0])}<span>${i+1} / ${steps.length}</span></summary>${step[1]?`<div class="subheading"><h4>Demande</h4><button class="text-button" data-step-copy="${i}">${icon('copy')} Copier</button></div><blockquote id="step-prompt-${i}">${esc(step[1])}</blockquote>`:''}<h4>Résultat et choix retenu</h4><p>${esc(step[2])}</p></details>`).join('')}</div>`;
$('.journey-aside>.ai-tool').outerHTML=toolHTML(c.config);
$('.journey-aside .config-list').innerHTML=`<div><dt>Contexte de travail</dt><dd>${esc(d.context)}</dd></div><div><dt>Type de création</dt><dd>${types[c.type]}</dd></div><div><dt>Publication</dt><dd>${esc(c.published)}</dd></div>`;
$('.journey-aside ul').innerHTML=d.adapt.map(t=>`<li>${esc(t)}</li>`).join('');
if(own){const ul=$('.journey-aside ul'),h=ul.previousElementSibling;if(c.limites){h.textContent='Limites constatées';ul.innerHTML=c.limites.split(/(?<=[.!?])\s+/).filter(Boolean).map(t=>`<li>${esc(t)}</li>`).join('');}else{h.hidden=true;ul.hidden=true;}
$('.reproduce .config-list').innerHTML=`<div><dt>${icon('sliders')} Réglages</dt><dd>${esc(c.reglages||'Aucun')}</dd></div><div><dt>${icon('moment')} Moments clés</dt><dd>${c.moments.length}</dd></div><div><dt>${icon('layers')} Parcours</dt><dd>${c.type==='projet'?c.steps.length+(c.steps.length>1?' étapes':' étape'):c.type==='iteration'?c.steps.length+(c.steps.length>1?' échanges':' échange'):'1 prompt'}</dd></div>`;}
$('.license').innerHTML=own&&c.licence&&c.licence!=='Tous droits réservés'?icon('scale')+` Licence ${esc(c.licence)}<br><span>Créditez ${esc(c.author)} en cas de réutilisation.</span>`:icon('scale')+' Conditions de réutilisation<span>Demandez l’accord de '+esc(c.author)+' avant de réutiliser cette création.</span>';
$('#reproductions .section-heading p:last-child').innerHTML='<span data-repro-count></span> reproductions <span class="success-summary">· <span data-success></span> de succès</span>';
$('.compatibility').hidden=true;
$('#try-model').innerHTML=`<option>${esc(c.config)}</option>`;
if(isProject){
$$('[data-try]').forEach(b=>b.hidden=true);$('#reproductions').hidden=true;$('.section-nav a[href="#reproductions"]').hidden=true;
$('.proof-stats>a').hidden=true;$('.proof-stats>div').hidden=true;$('.proof-stats').classList.add('project-stats');$('.proof-note').textContent='Un projet documenté en '+c.steps.length+' étapes';
}else if((c.repro||0)<3){$$('[data-success]').forEach(e=>{e.closest('.success-summary')?e.closest('.success-summary').hidden=true:e.parentElement.hidden=true;});$('.proof-note').textContent='Taux de succès disponible à partir de 3 essais';}
})();
