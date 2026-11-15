import { describe, expect, it } from 'vitest';
import { cheminMesure, reconnaitreAssistant } from './assistants-ia';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0';

describe('assistants d’IA (REF-03)', () => {
  it('reconnaît leurs robots et la nature de leur passage', () => {
    const agent = (robot: string) =>
      reconnaitreAssistant({
        userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ${robot}; +https://example.com/bot`,
      });
    expect(agent('ChatGPT-User/1.0')).toEqual({ assistant: 'CHATGPT', nature: 'LECTURE' });
    expect(agent('OAI-SearchBot/1.0')).toEqual({ assistant: 'CHATGPT', nature: 'EXPLORATION' });
    expect(agent('GPTBot/1.2')).toEqual({ assistant: 'CHATGPT', nature: 'ENTRAINEMENT' });
    expect(agent('Claude-User/1.0')).toEqual({ assistant: 'CLAUDE', nature: 'LECTURE' });
    expect(agent('ClaudeBot/1.0')).toEqual({ assistant: 'CLAUDE', nature: 'ENTRAINEMENT' });
    expect(agent('PerplexityBot/1.0')).toEqual({ assistant: 'PERPLEXITY', nature: 'EXPLORATION' });
    expect(agent('Perplexity-User/1.0')).toEqual({ assistant: 'PERPLEXITY', nature: 'LECTURE' });
    expect(agent('CCBot/2.0')).toEqual({ assistant: 'AUTRES', nature: 'ENTRAINEMENT' });
  });

  it('reconnaît les personnes venues d’un assistant, par la provenance ou utm_source', () => {
    expect(reconnaitreAssistant({ userAgent: CHROME, referent: 'https://chatgpt.com/' })).toEqual({
      assistant: 'CHATGPT',
      nature: 'VISITE',
    });
    expect(reconnaitreAssistant({ referent: 'https://www.perplexity.ai/search/abc' })).toEqual({
      assistant: 'PERPLEXITY',
      nature: 'VISITE',
    });
    expect(reconnaitreAssistant({ userAgent: CHROME, utmSource: 'ChatGPT.com' })).toEqual({
      assistant: 'CHATGPT',
      nature: 'VISITE',
    });
  });

  it('ignore les visiteurs ordinaires et les moteurs de recherche', () => {
    expect(reconnaitreAssistant({ userAgent: CHROME, referent: 'https://www.google.com/' })).toBe(
      null,
    );
    expect(
      reconnaitreAssistant({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }),
    ).toBeNull();
    expect(reconnaitreAssistant({ referent: 'https://faux-chatgpt.com/' })).toBeNull();
    expect(reconnaitreAssistant({ referent: 'pas une adresse' })).toBeNull();
    expect(reconnaitreAssistant({})).toBeNull();
  });

  it('réduit l’adresse à la page mesurée', () => {
    expect(cheminMesure('/creations/12-cite?utm_source=chatgpt.com')).toBe('/creations/12-cite');
    expect(cheminMesure('/explorer?guide=rendez-vous&utm_source=chatgpt.com')).toBe(
      '/explorer?guide=rendez-vous',
    );
    expect(cheminMesure('/apprendre?savoir=prompt-structure')).toBe(
      '/apprendre?savoir=prompt-structure',
    );
    expect(cheminMesure('/llms.txt')).toBe('/llms.txt');
    expect(cheminMesure('/admin/roles')).toBeNull();
    expect(cheminMesure('/moderation')).toBeNull();
    expect(cheminMesure('/api/v1/session')).toBeNull();
    expect(cheminMesure('//exemple.com/x')).toBeNull();
    expect(cheminMesure('https://exemple.com/')).toBeNull();
    expect(cheminMesure(`/forum/${'a'.repeat(200)}`)).toBeNull();
    expect(cheminMesure('/forum/<script>')).toBeNull();
  });
});
