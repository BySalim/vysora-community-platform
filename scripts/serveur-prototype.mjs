// Serveur statique du prototype (référence visuelle), sans dépendance.
// Usage : node scripts/serveur-prototype.mjs [--port 5173] [--dossier prototype]
// Les fichiers sont servis sans cache pour que chaque rechargement montre la dernière version.

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const port = Number(option('port', '5173'));
const racine = resolve(option('dossier', 'prototype'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const serveur = createServer((req, res) => {
  let chemin = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = normalize(join(racine, chemin));
  if (fichier !== racine && !fichier.startsWith(racine + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const infos = statSync(fichier);
    if (!infos.isFile()) throw new Error('pas un fichier');
    res.writeHead(200, {
      'Content-Type': TYPES[extname(fichier).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': infos.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(fichier).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
});

serveur.on('error', (erreur) => {
  console.error(
    erreur.code === 'EADDRINUSE'
      ? `Le port ${port} est déjà utilisé. Arrêtez l'autre serveur ou choisissez --port.`
      : erreur.message,
  );
  process.exit(1);
});

serveur.listen(port, '127.0.0.1', () => {
  console.log(`Prototype servi sur http://localhost:${port}`);
});
