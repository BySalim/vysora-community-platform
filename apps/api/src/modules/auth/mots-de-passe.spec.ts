import { createHash } from 'node:crypto';
import type { Configuration } from '../../config/env.js';
import { MotsDePasseService, contientSuffixe } from './mots-de-passe.service.js';

const service = (verifierFuites = true) =>
  new MotsDePasseService({ VERIFIER_FUITES: verifierFuites } as Configuration);

const empreinteSha1 = (valeur: string) =>
  createHash('sha1').update(valeur).digest('hex').toUpperCase();

describe('MotsDePasseService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hache en Argon2id et vérifie le mot de passe', async () => {
    const motsDePasse = service();
    const empreinte = await motsDePasse.hacher('lagune ocre baobab');
    expect(empreinte).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await motsDePasse.verifier(empreinte, 'lagune ocre baobab')).toBe(true);
    expect(await motsDePasse.verifier(empreinte, 'lagune ocre')).toBe(false);
  });

  it('refuse sans erreur quand le compte n’a pas d’empreinte', async () => {
    expect(await service().verifier(null, 'lagune ocre baobab')).toBe(false);
    expect(await service().verifier('empreinte-illisible', 'lagune ocre baobab')).toBe(false);
  });

  it('interroge la base des fuites avec les 5 premiers caractères de l’empreinte seulement (RG-04)', async () => {
    const empreinte = empreinteSha1('soleil-du-matin-2026');
    const appel = vi.fn(
      async (_adresse: string, _options?: RequestInit) =>
        new Response(`0000000000000000000000000000000000A:0\r\n${empreinte.slice(5)}:12\r\n`),
    );
    vi.stubGlobal('fetch', appel);

    expect(await service().estDansUneFuite('soleil-du-matin-2026')).toBe(true);
    expect(appel).toHaveBeenCalledOnce();
    const [adresse, options] = appel.mock.calls[0] ?? [];
    expect(adresse).toBe(`https://api.pwnedpasswords.com/range/${empreinte.slice(0, 5)}`);
    expect(new Headers(options?.headers).get('Add-Padding')).toBe('true');
  });

  it('ne bloque pas l’inscription si le service est indisponible ou désactivé', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );
    expect(await service().estDansUneFuite('soleil-du-matin-2026')).toBe(false);

    const appel = vi.fn();
    vi.stubGlobal('fetch', appel);
    expect(await service(false).estDansUneFuite('soleil-du-matin-2026')).toBe(false);
    expect(appel).not.toHaveBeenCalled();
  });

  it('ignore les lignes de remplissage, dont le nombre est nul', () => {
    expect(contientSuffixe('ABC:0\nDEF:3', 'ABC')).toBe(false);
    expect(contientSuffixe('ABC:0\r\nDEF:3\r\n', 'DEF')).toBe(true);
  });
});
