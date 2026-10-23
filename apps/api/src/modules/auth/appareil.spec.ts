import { resumerAppareil } from './appareil.js';

describe('resumerAppareil', () => {
  it('résume le navigateur et le système comme la liste des appareils du prototype', () => {
    expect(
      resumerAppareil(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome sur Windows');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari sur iPhone');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      ),
    ).toBe('Firefox sur Ubuntu');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      ),
    ).toBe('Edge sur Windows');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Chrome sur Android');
  });

  it('ne garde rien d’un en-tête absent ou inconnu', () => {
    expect(resumerAppareil(undefined)).toBeNull();
    expect(resumerAppareil('curl/8.10.1')).toBeNull();
  });
});
