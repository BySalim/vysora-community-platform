async (page) => {
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:5173/categorie.html');await page.waitForTimeout(350);
check(await page.locator('.explorer-card').count()===6,'Six créations Image');
check(await page.locator('#sort').inputValue()==='utile','Tri initial par utilité');
await page.locator('#sort').selectOption('recent');check((await page.locator('.explorer-card h2').first().textContent()).includes('bissap'),'Dates cohérentes avec le catalogue');await page.locator('#sort').selectOption('utile');
const links=await page.locator('.result-media').evaluateAll(els=>els.map(e=>e.href));
for(const link of links){const response=await page.request.get(link);check(response.ok(),'Lien de création disponible');}
await page.locator('[data-filter="modele"]').selectOption('1.1 Pro');check(await page.locator('.explorer-card').count()===1,'Modèle Flux disponible');await page.locator('[data-reset]').click();
await page.screenshot({path:'prototype/preview/categorie-desktop.png'});
await page.locator('#query').fill('cité');await page.locator('#search-form').evaluate(f=>f.requestSubmit());
check(await page.locator('.explorer-card').count()===1,'Recherche accentuée');
await page.reload();check(await page.locator('.explorer-card').count()===1,'Recherche persistée dans URL');
await page.locator('[data-reset]').click();await page.locator('[data-filter="kind"]').selectOption('projet');
check(await page.locator('.empty-results').count()===1,'État vide');await page.locator('[data-reset]').first().click();
await page.locator('[data-filter="outil"]').selectOption('Midjourney');check(await page.locator('.explorer-card').count()===3,'Filtre outil');
await page.locator('[data-filter="success"]').check();check(await page.locator('.explorer-card').count()===1,'Filtres combinés');
await page.goBack();check(await page.locator('.explorer-card').count()===3,'Retour navigateur');await page.locator('[data-reset]').click();
await page.locator('[data-tab="sujets"]').click();check(await page.locator('.topic-row').count()===3,'Trois sujets');
await page.locator('.topic-row h2 button').first().click();check(await page.locator('#detail').evaluate(d=>d.open),'Aperçu sujet');await page.keyboard.press('Escape');
await page.locator('[data-tab="bon-reflexe"]').click();check(await page.locator('.case-row').count()===2,'Deux cas pratiques');
await page.locator('.case-row h2 button').first().click();await page.locator('[data-answer="1"]').click();check((await page.locator('#quiz-feedback').textContent()).includes('Bonne réponse'),'Correction du cas');await page.locator('#quiz-retry').click();check(await page.locator('[data-answer]:enabled').count()===3,'Recommencer le cas');await page.keyboard.press('Escape');
await page.locator('[data-tab="creations"]').click();await page.locator('[data-tab="creations"]').focus();await page.keyboard.press('ArrowRight');check(await page.locator('[data-tab="sujets"]').getAttribute('aria-selected')==='true','Onglets clavier');await page.locator('[data-tab="creations"]').click();
await page.locator('#tweaks-open').click();
for(const [name,value] of Object.entries({accent:'deep',density:'compact',layout:'list',images:'below',effects:'strong',motion:'none'})){await page.locator(`#tweaks-form [name="${name}"]`).selectOption(value);check(await page.locator('html').getAttribute('data-explorer-'+name)===value,'Tweaks '+name);}
await page.locator('#tweaks-form button[type="reset"]').click();check(await page.locator('html').getAttribute('data-explorer-images')==='above','Réinitialisation Tweaks');await page.keyboard.press('Escape');
for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Aucun débordement '+width);if(width===390){await page.locator('#mobile-filter-toggle').click();check(await page.locator('#filters').isVisible(),'Filtres mobile');await page.locator('#mobile-filter-toggle').click();await page.locator('.menu-toggle').click();check(await page.locator('#mobile-panel').isVisible(),'Menu mobile');await page.keyboard.press('Escape');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'prototype/preview/categorie-mobile.png'});}}
await page.setViewportSize({width:1440,height:1000});
for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=600){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(100);}
await page.mouse.move(1420,980);await page.evaluate(()=>scrollTo(0,650));await page.screenshot({path:'prototype/preview/categorie-scroll.png'});
check(await page.locator('.explorer-tabs').evaluate(e=>Math.abs(e.getBoundingClientRect().top-88)<2),'Onglets épinglés');
await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'prototype/preview/categorie-full.png',fullPage:true});
check(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),'Images chargées');
await page.emulateMedia({reducedMotion:'reduce'});check(await page.locator('.explorer-card').first().evaluate(e=>getComputedStyle(e).animationName)==='none','Animations réduites');
await page.goto('http://127.0.0.1:5173/explorer.html');check(await page.locator('.explorer-card').count()===6,'Explorer inchangé');await page.locator('[data-tab="sujets"]').click();check(await page.locator('.topic-row').count()===6,'Sujets Explorer inchangés');
check(errors.length===0,'Aucune erreur JavaScript');return {checks,errors};
}
