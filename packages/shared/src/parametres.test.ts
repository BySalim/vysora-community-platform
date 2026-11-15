import { describe, expect, it } from 'vitest';
import { audienceRefusee } from './parametres';

describe('audienceRefusee (page Cookies, LEG-02)', () => {
  it('reconnaît le refus parmi les autres cookies', () => {
    expect(audienceRefusee('vysora_audience=refusee')).toBe(true);
    expect(audienceRefusee('__Host-vysora_session=abc; vysora_audience=refusee')).toBe(true);
    expect(audienceRefusee('vysora_audience=refusee;autre=1')).toBe(true);
  });

  it('ne voit pas de refus sans le cookie exact', () => {
    expect(audienceRefusee(null)).toBe(false);
    expect(audienceRefusee(undefined)).toBe(false);
    expect(audienceRefusee('')).toBe(false);
    expect(audienceRefusee('vysora_audience=oui')).toBe(false);
    expect(audienceRefusee('autre_vysora_audience=refusee')).toBe(false);
  });
});
