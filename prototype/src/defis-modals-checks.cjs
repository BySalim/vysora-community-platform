const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [], checks = [];
  const check = (ok, label) => { assert.ok(ok, label); checks.push(label); };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:5173/defis.html');
    await page.locator('[data-detail="affiche-1"]').first().click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'prototype/preview/defis-modal-creation.png' });
    await page.locator('[data-copy]').click();
    check((await page.evaluate(() => navigator.clipboard.readText())).includes('Saint-Louis'), 'Copie du prompt');
    check((await page.locator('[data-copy]').textContent()).includes('Copié'), 'Confirmation de copie');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-detail="affiche-1"]').first().evaluate(e => e === document.activeElement), 'Focus rendu à la création');
    await page.locator('[data-archive]').first().click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'prototype/preview/defis-modal-palmares.png' });
    check(await page.locator('.df-results li').count() === 5, 'Cinq rangs du palmarès');
    check(await page.locator('.df-archive-brief li').count() === 3, 'Contraintes du défi terminé');
    await page.locator('.df-archive-foot [data-close]').click();
    check(!await page.locator('.df-dialog').evaluate(e => e.open), 'Retour aux défis');
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      for (const [kind, selector] of [['creation', '[data-detail="affiche-3"]'], ['palmares', '[data-archive="40"]']]) {
        await page.locator(selector).first().click();
        await page.waitForTimeout(400);
        check(await page.locator('.df-dialog').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'Aucun débordement ' + kind + ' à ' + width);
        if (width === 390) await page.screenshot({ path: 'prototype/preview/defis-modal-' + kind + '-mobile.png' });
        await page.locator('.df-dialog').evaluate(e => e.scrollTop = e.scrollHeight);
        check(await page.locator('.df-dialog-bar [data-close]').evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'Fermeture visible après défilement ' + kind + ' à ' + width);
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => Vysora.etats.set({ session: 'membre' }));
    await page.locator('[data-detail="affiche-1"]').first().click();
    await page.locator('.df-dialog [data-vote]').click();
    check(await page.locator('.df-dialog [data-vote]').getAttribute('aria-pressed') === 'true', 'Vote dans la modale');
    check(await page.locator('.df-dialog [data-vote]').evaluate(e => e === document.activeElement), 'Focus préservé après le vote');
    await page.keyboard.press('Escape');
    await page.evaluate(() => Vysora.etats.set({ compte: 'suspendu' }));
    await page.locator('[data-detail="affiche-1"]').first().click();
    await page.locator('.df-dialog [data-vote]').click();
    check(await page.locator('.df-dialog [data-vote]').getAttribute('aria-pressed') === 'true', 'Lecture seule respectée dans la modale');
    await page.keyboard.press('Escape');
    await page.evaluate(() => Vysora.regler('statut', 'cloture'));
    await page.locator('[data-detail="affiche-1"]').first().click();
    check(await page.locator('.df-dialog [data-vote]').isDisabled(), 'Vote désactivé après clôture');
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-archive]').first().click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.df-dialog')).animationName === 'none');
    check(true, 'Préférence de réduction des animations');
    check(errors.length === 0, 'Aucune erreur JavaScript');
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
