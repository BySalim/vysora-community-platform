const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (value, label) => { assert.ok(value, label); checks.push(label); };
  try {
    await page.goto('http://127.0.0.1:5173/defis.html');
    await page.waitForTimeout(500);
    check(await page.locator('.df-card').count() === 6, 'Six participations disponibles');
    await page.locator('[data-vote]').first().click();
    check(await page.locator('[data-vote]').first().getAttribute('aria-pressed') === 'false', 'Vote interdit au visiteur');
    await page.keyboard.press('Escape');
    await page.locator('.df-how summary').click();
    check(await page.locator('.df-how').getAttribute('open') !== null, 'Aide dépliable');
    await page.locator('.df-how summary').click();
    await page.locator('[data-tool="ChatGPT"]').click();
    check(await page.locator('.df-card').count() === 2, 'Filtrage par outil');
    await page.locator('#df-search').fill('aucun-lieu');
    check(await page.locator('.df-empty').isVisible(), 'Recherche sans résultat');
    await page.locator('[data-clear]').click();
    check(await page.locator('.df-card').count() === 6, 'Réinitialisation des filtres');
    await page.locator('#df-sort').selectOption('recent');
    check(await page.locator('.df-card').first().getAttribute('data-entry') === 'affiche-6', 'Tri chronologique');
    await page.locator('[data-detail]').first().click();
    check(await page.locator('.df-dialog').evaluate(e => e.open), 'Détail du parcours');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-detail]').first().evaluate(e => e === document.activeElement), 'Retour du focus après fermeture');
    await page.evaluate(() => Vysora.etats.set({ session: 'membre' }));
    await page.locator('[data-vote]').first().click();
    check(await page.locator('[data-vote]').first().getAttribute('aria-pressed') === 'true', 'Vote membre');
    await page.evaluate(() => Vysora.etats.set({ compte: 'suspendu' }));
    await page.locator('[data-vote]').first().click();
    check(await page.locator('[data-vote]').first().getAttribute('aria-pressed') === 'true', 'Vote bloqué en lecture seule');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { Vysora.etats.set({ compte: 'actif' }); Vysora.regler('participation', 'publiee'); });
    await page.locator('[data-participer]').first().click();
    check((await page.locator('#df-dialog-title').textContent()).includes('inscrite'), 'Participation déjà publiée');
    await page.keyboard.press('Escape');
    await page.evaluate(() => Vysora.regler('statut', 'cloture'));
    check(await page.locator('[data-vote]').first().isDisabled(), 'Défi clôturé');
    await page.evaluate(() => { Vysora.regler('statut', 'brouillon'); Vysora.etats.set({ session: 'visiteur' }); });
    check((await page.locator('[data-current]').textContent()).includes('introuvable'), 'Brouillon privé');
    await page.evaluate(() => Vysora.etats.set({ session: 'membre', role: 'admin' }));
    check(await page.locator('.df-brief').isVisible(), 'Brouillon visible pour administration');
    await page.evaluate(() => { Vysora.regler('statut', 'publie'); Vysora.regler('donnees', 'vide'); });
    check(await page.locator('.df-card').count() === 0, 'Liste vide');
    await page.evaluate(() => { Vysora.regler('donnees', 'remplies'); Vysora.regler('participation', 'aucune'); Vysora.etats.reset(); });
    await page.locator('[data-archive]').first().click();
    check(await page.locator('.df-results li').count() > 0, 'Résultats des archives');
    await page.keyboard.press('Escape');
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(450);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Aucun débordement à ' + width);
      if (width === 390) {
        await page.screenshot({ path: 'prototype/preview/defis-mobile.png', fullPage: false });
        await page.locator('.menu-toggle').click();
        check(await page.locator('#mobile-panel').isVisible(), 'Navigation mobile ouverte');
        await page.keyboard.press('Escape');
        check(!await page.locator('#mobile-panel').isVisible(), 'Navigation mobile fermée au clavier');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const brief of ['bleu', 'neutre', 'encre']) {
      await page.evaluate(v => Vysora.regler('brief', v), brief);
      check(await page.locator('html').getAttribute('data-brief') === brief, 'Ambiance ' + brief);
    }
    await page.evaluate(() => Vysora.regler('disposition', 'liste'));
    check(await page.locator('.df-card').first().evaluate(e => getComputedStyle(e).display) === 'grid', 'Variante liste');
    await page.evaluate(() => Vysora.regler('disposition', 'grille'));
    await page.locator('[data-tweaks-open]').click();
    await page.locator('[data-tw-tab="apparence"]').click();
    await page.locator('#tw-apparence [name="brief"][value="bleu"]').check();
    await page.locator('[data-tweaks-reset]').click();
    check(await page.locator('html').getAttribute('data-brief') === 'encre', 'Réinitialisation via le panneau Tweaks');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-tweaks-open]').evaluate(e => e === document.activeElement), 'Focus restitué après Tweaks');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.df-brief')).animationName === 'none');
    check(await page.locator('.df-brief').evaluate(e => getComputedStyle(e).animationName) === 'none', 'Réduction des animations');
    await page.locator('#df-sort').selectOption('useful');
    for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 650) {
      await page.evaluate(y => scrollTo(0, y), y);
      await page.waitForTimeout(80);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'prototype/preview/defis-desktop.png' });
    await page.screenshot({ path: 'prototype/preview/defis-full.png', fullPage: true });
    check(await page.locator('img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0)), 'Images chargées');
    check(errors.length === 0, 'Aucune erreur JavaScript');
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
