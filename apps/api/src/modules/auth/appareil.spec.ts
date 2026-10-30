import { resumerAppareil } from './appareil.js';

describe('resumerAppareil', () => {
  it('résume le navigateur et le système', () => {
    expect(
      resumerAppareil(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome sur Windows');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
      ),
    ).toBe('Edge sur Windows');
    expect(
      resumerAppareil(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari sur iPhone');
    expect(
      resumerAppareil('Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0'),
    ).toBe('Firefox sur Linux');
  });

  it('ne garde rien d’un en-tête absent ou inconnu', () => {
    expect(resumerAppareil(undefined)).toBeNull();
    expect(resumerAppareil('curl/8.10.1')).toBeNull();
  });
});
