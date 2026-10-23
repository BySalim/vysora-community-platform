async (page) => {
  const checks = [];
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  const base = 'http://127.0.0.1:5173/';
  const etat = (etats, reglages) => page.evaluate(([e, r]) => {
    localStorage.setItem('vysora-etats', JSON.stringify(e));
    localStorage.setItem('vysora-publier-reglages-v3', JSON.stringify(r));
    localStorage.removeItem('vysora-publier-fiche');
    return new Promise(resolve => { const q = indexedDB.deleteDatabase('vysora-publier'); q.onsuccess = q.onerror = q.onblocked = resolve; });
  }, [etats, reglages]);
  const membre = { session: 'membre', role: 'membre', niveau: 'apprenti', compte: 'actif', notifications: 'lues' };
  const focusK = () => page.evaluate(() => document.activeElement.dataset.k || document.activeElement.id || '');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + 'nouvelle-creation.html');

  /* Visiteur : le formulaire laisse place à l'invitation. */
  await etat({ session: 'visiteur' }, {});
  await page.reload({ waitUntil: 'networkidle' });
  check(await page.locator('[data-pub-gate] .acces-bloc').isVisible(), 'Visiteur : invitation à se connecter');
  check(await page.locator('[data-pub-editor]').isHidden(), 'Visiteur : formulaire masqué');

  /* Nouvelle création : une seule page, vide, avec un prompt à remplir. */
  await etat(membre, { contenu: 'vide' });
  await page.goto(base + 'nouvelle-creation.html', { waitUntil: 'networkidle' });
  check(await page.locator('#f-titre').inputValue() === '', 'Titre vide à l’ouverture');
  check(await page.locator('.pub-res').count() === 0, 'Aucun résultat d’avance');
  check(await page.locator('.pub-bloc').count() === 1, 'Un prompt à remplir');
  check((await page.locator('.pub-type').textContent()).includes('se déduit'), 'Type de création encore inconnu');

  /* Publier sans rien remplir : erreurs sous les champs, liste à jour, focus sur le premier champ. */
  await page.locator('.pub-publier').click();
  check(await focusK() === 'titre', 'Le focus va au premier champ à compléter');
  check(await page.locator('.pub-liste .is-erreur').count() === 4, 'Quatre points signalés dans la liste');
  check(await page.locator('#f-titre').getAttribute('aria-invalid') === 'true', 'Titre signalé comme invalide');
  await page.keyboard.type('Courrier de réclamation à un fournisseur d’électricité');
  check(await page.locator('#f-titre-err').count() === 0, 'L’erreur du titre disparaît pendant la saisie');
  await page.locator('#f-objectif').fill('Une lettre ferme et polie pour contester une facture estimée trop élevée.');

  /* Le résultat peut être un texte. */
  await page.locator('[data-action="ajouter-resultat"][data-sorte="texte"]').click();
  check((await focusK()).endsWith(':texte'), 'Le texte ajouté reçoit le focus');
  await page.keyboard.type('Madame, Monsieur, je conteste la facture du 3 octobre, établie sur une estimation.');

  /* Le chemin : coller une conversation, outil et modèle repérés. */
  await page.locator('[data-action="importer"]').click();
  await page.locator('[data-import-texte]').fill('Vous : Rédige un courrier pour contester une facture d’électricité estimée.\n\nChatGPT : Voici un courrier.\n\nVous : Plus ferme, et cite la date du relevé. Contact : fatou.ndiaye@gmail.com\n\nChatGPT : Voici la version corrigée, avec GPT-5.');
  await page.locator('[data-import-analyser]').click();
  check(await page.locator('.pub-import-resultat li').count() === 2, 'Deux prompts repérés');
  await page.locator('[data-import-ajouter]').click();
  check(await page.locator('.pub-bloc').count() === 2, 'Les prompts remplacent le bloc vide');
  check((await page.locator('.pub-outil').first().textContent()).includes('ChatGPT'), 'Outil repéré dans la conversation');
  check((await page.locator('.pub-type').textContent()).includes('Itération'), 'Type déduit : itération');

  /* Moment clé sur le deuxième prompt. */
  await page.locator('[data-action="moment"]').nth(1).click();
  check((await focusK()).startsWith('mt:'), 'Le type de moment reçoit le focus');
  await page.locator('[data-f^="m:"]').fill('La première lettre suppliait presque ; demander un ton ferme et une date précise l’a rendue crédible.');
  check((await page.locator('.pub-liste').textContent()).replace(/\s+/g, ' ').includes('1 moment clé'), 'Moment clé compté dans la liste');

  /* Un outil différent fait passer la création en projet. */
  await page.locator('[data-action="outil"]').nth(1).click();
  await page.keyboard.type('claude');
  await page.keyboard.press('Enter');
  check((await page.locator('.pub-outil').nth(1).textContent()).includes('Claude'), 'Outil choisi au clavier');
  check((await page.locator('.pub-type').textContent()).includes('Projet'), 'Deux outils : projet');
  await page.locator('[data-action="outil"]').nth(1).click();
  await page.keyboard.type('chatgpt');
  await page.keyboard.press('Enter');

  /* Donnée sensible repérée sous le prompt, puis masquée. */
  await page.locator('[data-f$=":prompt"]').nth(1).focus();
  await page.locator('#f-titre').focus();
  check(await page.locator('.pub-alerte').count() === 1, 'Adresse e-mail signalée sous le prompt');
  await page.locator('.pub-alerte [data-action="masquer"]').click();
  check((await page.locator('[data-f$=":prompt"]').nth(1).inputValue()).includes('[adresse e-mail masquée]'), 'Adresse masquée');

  /* Catégorie proposée, confirmation, publication. */
  await page.locator('[data-action="proposer-categorie"]').click();
  check(await page.locator('#f-categorie').inputValue() === 'Texte et rédaction', 'Catégorie proposée d’après l’outil');
  await page.locator('.pub-publier').click();
  check((await page.locator('#f-consentement-err').textContent()).includes('Cochez'), 'Confirmation obligatoire');
  await page.check('#f-consentement');
  await page.locator('.pub-publier').click();
  await page.waitForTimeout(400);
  check(await page.locator('[data-fin-titre]').isVisible(), 'Création publiée');

  /* La fiche affiche le texte obtenu, sans l'adresse masquée. */
  await page.goto(base + 'fiche-creation.html?id=ma-creation', { waitUntil: 'networkidle' });
  check((await page.locator('.creation-heading h1').textContent()).includes('réclamation'), 'Fiche de la création publiée');
  check((await page.locator('.creation-preview').first().textContent()).includes('je conteste la facture'), 'Le texte obtenu sert de résultat');
  check(!(await page.content()).includes('fatou.ndiaye@gmail.com'), 'L’adresse masquée n’apparaît pas sur la fiche');

  /* Limite de publication atteinte. */
  await etat({ ...membre, niveau: 'curieux' }, { contenu: 'brouillon', exemple: 'iteration', quota: 'atteint' });
  await page.goto(base + 'nouvelle-creation.html', { waitUntil: 'networkidle' });
  check((await page.locator('#pub-limite').textContent()).includes('Limite'), 'Limite du niveau Curieux');

  if (errors.length) throw Error(errors.join(' | '));
  return checks;
}
