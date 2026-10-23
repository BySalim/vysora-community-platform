import { attenteApres } from './temporisation.service.js';

describe('attenteApres (F-03)', () => {
  it('laisse passer les 4 premiers échecs', () => {
    for (let echecs = 0; echecs < 5; echecs += 1) expect(attenteApres(echecs)).toBe(0);
  });

  it('temporise 30 secondes au 5e échec, double ensuite, sans dépasser 15 minutes', () => {
    expect(attenteApres(5)).toBe(30);
    expect(attenteApres(6)).toBe(60);
    expect(attenteApres(7)).toBe(120);
    expect(attenteApres(9)).toBe(480);
    expect(attenteApres(10)).toBe(900);
    expect(attenteApres(30)).toBe(900);
  });
});
