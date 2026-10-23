'use strict';
(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const creation=window.VYSORA_CURRENT_CREATION;
if(!creation)return;
const V=window.Vysora,E=V.etats;const notify=message=>V.toast(message);
const isCity=creation.id==='cite-ciel-mer',isProject=creation.type==='projet';
const key='vysora-'+creation.id;
let state={saved:false,useful:false,comments:[],trials:[]};
try { const saved=JSON.parse(localStorage.getItem(key)); if(saved&&Array.isArray(saved.comments)&&Array.isArray(saved.trials))state={...state,...saved}; } catch {}
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{notify('Votre navigateur ne permet pas de conserver ces modifications.');}};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=()=>new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const baseTrials=isCity?[{name:'Aïssatou Ndiaye',avatar:'aissatou-ndiaye',outcome:'Réussi',model:'ChatGPT · GPT Image 1',note:'Les tours centrales structurent bien la scène. J’ai conservé le prompt sans modification.'},{name:'Kofi Mensah',avatar:'kofi-mensah',outcome:'Réussi',model:'ChatGPT · GPT Image 1',note:'J’ai remplacé le ciel abricot par une lumière de début de journée. La composition reste lisible.'},{name:'Yacine Benali',avatar:'yacine-benali',outcome:'Résultat partiel',model:'Midjourney · v7',note:'Les tours sont réussies, mais la texture est plus photographique que peinte.'}]:[];
const baseComments=isCity?[{name:'Aïssatou Ndiaye',avatar:'aissatou-ndiaye',date:'12 oct. 2026',note:'La précision sur les tours centrales change vraiment la composition. Merci pour le prompt !'},{name:'Léa Martin',avatar:'lea-martin',date:'12 oct. 2026',note:'Oui, c’est le détail qui a fait la différence. J’ai aussi gardé « sans texte » pour éviter les inscriptions sur les façades.'}]:[];

/* États de la page : point de vue, statut de la création, avertissement.
   Ils se combinent avec la session (etats.js) : un brouillon n'est visible que de son auteur,
   une création masquée de son auteur et de la modération (RG-17, RG-30). */
let page={vue:'lecteur',statut:'publiee',alerte:'aucune'};
let deleted=false;
const own=!!creation.own,apercu=!!creation.apercu;
const auteur=()=>E.membre()&&(page.vue==='auteur'||own);
const moderation=()=>E.membre()&&E.get().role!=='membre';
const visible=()=>page.statut==='publiee'||auteur()||(page.statut==='masquee'&&moderation());
const mine=r=>r.mine||r.name==='Vous'||(auteur()&&r.name===creation.author);
const nameOf=r=>mine(r)?(E.membre()?'Vous':E.MOI.nom):r.name;
const face=r=>mine(r)?V.avatarMoi(40):`<img src="assets/avatars/${r.avatar}.webp" alt="" width="40" height="40">`;
const model=(creation.config||'').split('·').pop().trim()||creation.config;
const published=$('.author strong+span').textContent.replace(/^[^·]+·\s*/,'');

function person(r){return `<div class="person">${face(r)}<div><strong>${escape(nameOf(r))}</strong>${r.outcome?`<span>${r.outcome==='Réussi'?'✓ ':r.outcome==='Résultat partiel'?'◐ ':'○ '}${escape(r.outcome)}</span>`:''}</div>${r.date?`<time>${escape(r.date)}</time>`:''}</div>`;}
function render(){
$('#save').setAttribute('aria-pressed',E.membre()&&state.saved);$('#save').setAttribute('aria-label',E.membre()&&state.saved?'Retirer des créations enregistrées':'Enregistrer la création');
$('#useful').setAttribute('aria-pressed',E.membre()&&!auteur()&&state.useful);$('#useful').disabled=auteur();$('#useful').title=auteur()?'Les votes « Utile » viennent des autres membres':'';$('#useful-count').textContent=creation.useful+Number(state.useful);
const initial=creation.repro||0,total=initial+state.trials.length,known=isCity||initial===0||Number.isFinite(creation.success),success=Math.round(((isCity?27:Math.round(initial*(creation.success||0)/100))+state.trials.filter(t=>t.outcome==='Réussi').length)/Math.max(1,total)*100);
if(!isProject){$$('[data-success]').forEach(e=>{(e.closest('.success-summary')||e.parentElement).hidden=total<3||!known;});$('.proof-note').textContent=total<3?'Taux de succès disponible à partir de 3 essais':known?'Selon les retours de la communauté':'Résultats des essais précédents non renseignés';}
$$('[data-repro-count]').forEach(e=>e.textContent=total);$$('[data-success]').forEach(e=>e.textContent=success+' %');
$('#repro-list').innerHTML=[...state.trials,...baseTrials].map(r=>`<article class="repro-item">${person(r)}${window.VYSORA_TOOL_HTML(r.model)}<p>${escape(r.note)}</p></article>`).join('')||`<p class="empty-detail">${total?'Les essais déclarés ne comportent pas encore de retour détaillé.':'Aucun essai partagé pour le moment. Partagez le premier retour.'}</p>`;
$('.sample-note').textContent=(baseTrials.length+state.trials.length)?`${baseTrials.length+state.trials.length} retours détaillés sur les ${total} essais déclarés.`:'';
const comments=[...baseComments,...state.comments];$('#comment-count').textContent=comments.length;
$('#comments-list').innerHTML=comments.map((r,i)=>`<article class="comment-row">${person(r)}<p>${r.reply?`En réponse à ${escape(r.reply)} :\n`:''}${escape(r.note)}</p><button class="text-button" data-reply="${i}">Répondre<span class="sr-only"> à ${escape(nameOf(r))}</span></button></article>`).join('')||'<p class="empty-detail">Aucun commentaire pour le moment. Posez une question ou partagez votre retour.</p>';
const gate=V.invitation('contribuer','commenter');$('#comment-form').hidden=!!gate;$('[data-comment-gate]').hidden=!gate;$('[data-comment-gate]').innerHTML=gate;
if(isCity)$$('.compatibility tbody tr').forEach((row,i)=>{const model=['ChatGPT · GPT Image 1','Midjourney · v7','Stable Diffusion · SDXL'][i];const trials=state.trials.filter(t=>t.model===model);const count=[30,9,5][i]+trials.length,good=[21,4,2][i]+trials.filter(t=>t.outcome==='Réussi').length;const cells=row.querySelectorAll('td');cells[0].textContent=count;cells[1].textContent=good;cells[2].textContent=Math.round(good/count*100)+' %';});
}

/* Vue de l'auteur, statut et avertissements ------------------------------ */
const shell=$('.creation-shell');
const origin={author:$('.author').innerHTML,small:$('.small-author').innerHTML,license:$('.license').innerHTML};
shell.insertAdjacentHTML('afterbegin',`<section class="detail-section creation-off" data-off="indisponible"><h1>Cette création n’est pas disponible</h1><p>Elle a peut-être été retirée par son auteur ou masquée par la modération.</p><a class="btn btn-primary" href="explorer.html">Retour à Explorer</a></section><section class="detail-section creation-off" data-off="supprimee"><h1>Création supprimée</h1><p>« ${escape(creation.title)} » ne figure plus sur Vysora.</p><div class="creation-off-actions"><a class="btn btn-primary" href="mes-contenus.html">Voir mes contenus</a><a class="btn btn-secondary" href="nouvelle-creation.html">Publier une création</a></div></section>`);
$('.breadcrumbs').insertAdjacentHTML('afterend','<div class="creation-status" data-status hidden></div>');
$('.creation-heading').insertAdjacentHTML('afterend','<p class="creation-alert" data-alert hidden></p>');
$('#comment-form').insertAdjacentHTML('afterend','<p class="comment-gate" data-comment-gate hidden></p>');
const STATUS={
  publiee:()=>[`<b>Votre création</b> · publiée ${escape(published.replace(/^Publié /,''))}`,'depublier'],
  brouillon:()=>['<b>Brouillon</b> · visible de vous seul. Les votes, les essais et les commentaires réapparaissent à la publication.','publier'],
  masquee:()=>['<b>Masquée par la modération le 14 octobre 2026.</b> Motif : informations personnelles visibles sur une capture. Modifiez la création pour demander un nouvel examen.','']
};
function statusHTML(){
  if(apercu)return '';
  if(auteur()){const [text,action]=STATUS[page.statut]();return `<p>${text}</p><div class="creation-status-actions"><a class="btn btn-secondary btn-sm" href="nouvelle-creation.html?id=${encodeURIComponent(creation.id)}">Modifier</a>${action==='depublier'?'<button class="btn btn-quiet btn-sm" type="button" data-status-action="brouillon">Dépublier</button>':action==='publier'?'<button class="btn btn-primary btn-sm" type="button" data-status-action="publiee">Publier</button>':''}<button class="btn btn-quiet btn-sm is-danger" type="button" data-delete>Supprimer</button></div>`;}
  if(page.statut==='masquee'&&moderation())return `<p><b>Masquée par la modération le 14 octobre 2026</b> · 3 signalements · Motif : informations personnelles visibles sur une capture.</p><div class="creation-status-actions"><a class="btn btn-secondary btn-sm" href="moderation.html">Ouvrir le dossier</a></div>`;
  return '';
}
const ALERT={
  obsolete:()=>`<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg><span><b>Signalée comme ne fonctionnant plus avec ${escape(model)}</b> par 3 membres depuis le 14 octobre 2026. Vérifiez le résultat avant de vous appuyer sur cette méthode.</span>`,
  agent:()=>'<svg class="icon" aria-hidden="true"><use href="#i-shield"/></svg><span><b>Ce prompt contient des instructions pour un agent</b> qui peut agir sur vos fichiers, vos commandes ou vos services. Relisez-le avant de le confier à un outil.</span>'
};
function applyEtat(){
  shell.dataset.affichage=deleted?'supprimee':visible()?'creation':'indisponible';
  shell.dataset.statut=page.statut;
  shell.toggleAttribute('data-auteur',auteur());
  const status=statusHTML();$('[data-status]').hidden=!status;$('[data-status]').innerHTML=status;
  const alert=ALERT[page.alerte];$('[data-alert]').hidden=!alert;$('[data-alert]').innerHTML=alert?alert():'';
  $('.author').innerHTML=origin.author;$('.small-author').innerHTML=origin.small;$('.license').innerHTML=origin.license;
  if(auteur()){
    $('.author img, .author .avatar').outerHTML=V.avatarMoi(44);$('.author strong').textContent=E.MOI.nom;$('.author strong+span').textContent=`${E.niveau().nom} · ${published}`;
    $('.small-author img, .small-author .avatar').outerHTML=V.avatarMoi(28);$('.small-author').lastChild.textContent=E.MOI.nom;
    $('.license').innerHTML=$('.license').innerHTML.split(creation.author).join(escape(E.MOI.nom));
  }
  document.title=deleted?'Création supprimée · Vysora':visible()?creation.title+' · Vysora':'Création indisponible · Vysora';
  render();
}

$('#save').onclick=()=>{if(!V.exiger('contribuer','enregistrer cette création'))return;state.saved=!state.saved;persist();render();notify(state.saved?'Création enregistrée.':'Création retirée des enregistrements.');};
$('#useful').onclick=()=>{if(auteur()||!V.exiger('contribuer','voter « Utile »'))return;state.useful=!state.useful;persist();render();notify(state.useful?'Votre vote a été ajouté.':'Votre vote a été retiré.');};
async function copy(text,message){try{await navigator.clipboard.writeText(text);notify(message);}catch{notify('Copie indisponible. Sélectionnez le texte pour le copier.');}}
const copied=()=>page.alerte==='agent'?'Prompt copié. Relisez les instructions avant de les confier à un agent.':'Prompt copié.';
$$('[data-step-copy]').forEach(b=>b.onclick=()=>copy($('#step-prompt-'+b.dataset.stepCopy).textContent,copied()));
$$('[data-copy]').forEach(b=>b.onclick=()=>copy($('#prompt-text').textContent,copied()));
$('#share').onclick=()=>copy(new URL('fiche-creation.html?id='+encodeURIComponent(creation.id),location.href).href,'Lien de la création copié.');
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('.image-open').onclick=()=>$('#lightbox').showModal();
$$('[data-try]').forEach(b=>b.onclick=()=>{if(V.exiger('contribuer','partager votre essai'))$('#try-dialog').showModal();});
$('#report-open').onclick=()=>{if(V.exiger('contribuer','signaler un contenu'))$('#report-dialog').showModal();};
$('#try-form').onsubmit=e=>{e.preventDefault();if(isProject)return;const note=$('#try-note');if(!note.value.trim()){note.setCustomValidity('Décrivez votre résultat.');note.reportValidity();return;}state.trials.unshift({name:'Vous',mine:true,outcome:new FormData(e.target).get('outcome'),model:$('#try-model').value,note:note.value.trim()});persist();render();$('#try-dialog').close();e.target.reset();notify('Votre essai a été ajouté.');};
$('#try-note').oninput=e=>e.target.setCustomValidity('');
let reply='';
$('#comments-list').onclick=e=>{const button=e.target.closest('[data-reply]');if(!button||!V.exiger('contribuer','répondre'))return;reply=nameOf([...baseComments,...state.comments][+button.dataset.reply]);$('#comment-context').hidden=false;$('#comment-context').textContent='En réponse à '+reply+' ';const cancel=document.createElement('button');cancel.type='button';cancel.className='text-button';cancel.textContent='Annuler';cancel.onclick=()=>{reply='';$('#comment-context').hidden=true;};$('#comment-context').append(cancel);$('#comment').focus();};
$('#comment-form').onsubmit=e=>{e.preventDefault();if(!V.exiger('contribuer','commenter'))return;const field=$('#comment');if(!field.value.trim()){field.setCustomValidity('Écrivez votre commentaire.');field.reportValidity();return;}state.comments.push({name:'Vous',mine:true,date:date(),note:field.value.trim(),reply});persist();render();e.target.reset();reply='';$('#comment-context').hidden=true;notify('Commentaire publié.');};
$('#comment').oninput=e=>e.target.setCustomValidity('');
$('#report-form').onsubmit=e=>{e.preventDefault();if(!$('#report-note').value.trim()){ $('#report-note').setCustomValidity('Précisez le motif du signalement.');$('#report-note').reportValidity();return;}$('#report-dialog').close();e.target.reset();notify('Signalement enregistré.');};
$('#report-note').oninput=e=>e.target.setCustomValidity('');

/* Actions de l'auteur : publier, dépublier, supprimer. */
document.body.insertAdjacentHTML('beforeend',`<dialog id="delete-dialog" class="creation-dialog" aria-labelledby="delete-title"><div class="dialog-heading"><h2 id="delete-title">Supprimer cette création ?</h2><button class="icon-btn" data-close aria-label="Fermer"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div><p>Ses essais déclarés et ses commentaires seront supprimés définitivement.</p><div class="creation-off-actions"><button class="btn btn-secondary" type="button" data-close>Annuler</button><button class="btn btn-primary is-danger" type="button" data-delete-confirm>Supprimer la création</button></div></dialog>`);
$$('#delete-dialog [data-close]').forEach(b=>b.onclick=()=>$('#delete-dialog').close());
shell.addEventListener('click',e=>{
  const action=e.target.closest('[data-status-action]');
  if(action){if(!V.exiger('contribuer',action.dataset.statusAction==='publiee'?'publier cette création':'dépublier cette création'))return;V.regler('statut',action.dataset.statusAction);notify(action.dataset.statusAction==='publiee'?'Création publiée.':'Création dépubliée : elle est de nouveau un brouillon.');return;}
  if(e.target.closest('[data-delete]'))$('#delete-dialog').showModal();
});
$('[data-delete-confirm]').onclick=()=>{$('#delete-dialog').close();deleted=true;applyEtat();scrollTo({top:0});notify('Création supprimée.');};

V.initTweaks({
  key:'vysora-fiche-reglages',
  etats:[
    {name:'vue',legend:'Point de vue',options:[['lecteur','Lecteur'],['auteur','Auteur de la création']],si:e=>e.session==='membre'},
    {name:'statut',legend:'Statut de la création',options:[['publiee','Publiée'],['brouillon','Brouillon'],['masquee','Masquée par la modération']]},
    {name:'alerte',legend:'Avertissement',options:[['aucune','Aucun'],['obsolete','Obsolescence signalée'],['agent','Instructions pour agent']]}
  ],
  apparence:[
    {name:'layout',legend:'Mise en page',options:[['balanced','Équilibrée'],['immersive','Image immersive']]},
    'accent','density','effects','motion'
  ],
  defaults:{vue:'lecteur',statut:'publiee',alerte:'aucune',layout:'balanced'},
  onChange:(changed,settings)=>{document.documentElement.style.scrollBehavior=V.motion.level()==='none'?'auto':'';page={vue:settings.vue,statut:apercu?'publiee':settings.statut,alerte:own&&creation.agent&&settings.alerte==='aucune'?'agent':settings.alerte};if(['vue','statut','alerte','reset','init'].includes(changed))applyEtat();}
});
E.on(applyEtat);
if(apercu)shell.inert=true;

const links=$$('.section-nav a'), sections=$$('#resultat,#parcours,#reproductions,#commentaires').filter(s=>!s.hidden);
function updateSection(){let current=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<=Math.max(200,innerHeight*.35))current=section;links.forEach(a=>{const active=a.hash==='#'+current.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
let scrollPending=false;addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(()=>{updateSection();scrollPending=false;});}},{passive:true});addEventListener('resize',updateSection);updateSection();
const menu=$('.menu-toggle');menu.onclick=()=>{const expanded=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',expanded);menu.setAttribute('aria-label',expanded?'Fermer le menu':'Ouvrir le menu');$('#mobile-panel').hidden=!expanded;};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#mobile-panel').hidden){$('#mobile-panel').hidden=true;menu.setAttribute('aria-expanded','false');menu.focus();}});
})();
