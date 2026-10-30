import { decoderBase32, encoderBase32, hotp, verifierTotp } from './totp.js';

describe('TOTP (SEC-02)', () => {
  // RFC 4226, annexe D : clé « 12345678901234567890 ».
  const cle = Buffer.from('12345678901234567890');

  it('reproduit les vecteurs de la RFC 4226', () => {
    expect([0, 1, 2, 3, 9].map((n) => hotp(cle, n))).toEqual([
      '755224',
      '287082',
      '359152',
      '969429',
      '520489',
    ]);
  });

  it('reproduit un vecteur de la RFC 6238 (SHA-1, 59 s)', () => {
    expect(hotp(cle, Math.floor(59 / 30), 8)).toBe('94287082');
  });

  it('encode et décode la clé en base32', () => {
    const base32 = encoderBase32(cle);
    expect(base32).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(decoderBase32(base32).equals(cle)).toBe(true);
  });

  it('accepte le code du moment et ceux d’un pas voisin, refuse les autres', () => {
    const base32 = encoderBase32(cle);
    const instant = new Date(1_700_000_000_000);
    const pas = Math.floor(instant.getTime() / 30_000);
    expect(verifierTotp(base32, hotp(cle, pas), instant)).toBe(pas);
    expect(verifierTotp(base32, hotp(cle, pas - 1), instant)).toBe(pas - 1);
    expect(verifierTotp(base32, hotp(cle, pas + 3), instant)).toBeNull();
    expect(verifierTotp(base32, 'abcdef', instant)).toBeNull();
  });
});
