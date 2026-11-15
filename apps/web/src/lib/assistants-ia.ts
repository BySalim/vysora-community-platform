import { audienceRefusee, cheminMesure, reconnaitreAssistant } from '@vysora/shared';
import { appelerApi } from './api';

/* REF-03 : page servie à un assistant d'IA, ou à une personne venue de l'un d'eux. Le site signale le
   passage à l'API sans attendre sa réponse ni retarder la page ; un échec ne se voit pas. Les autres
   visites ne font aucun appel, ni celles d'un appareil qui a refusé la mesure d'audience (page
   Cookies, LEG-02). */
export function signalerPassageAssistant(requete: Request, url: URL): void {
  if (audienceRefusee(requete.headers.get('cookie'))) return;
  const userAgent = requete.headers.get('user-agent');
  const referent = requete.headers.get('referer');
  const adresse = url.pathname + url.search;
  if (!cheminMesure(adresse)) return;
  if (!reconnaitreAssistant({ userAgent, referent, utmSource: url.searchParams.get('utm_source') }))
    return;
  appelerApi('/api/v1/assistants-ia/passages', {
    corps: { adresse, userAgent, referent },
    signal: AbortSignal.timeout(3000),
  }).catch((erreur: unknown) => console.error('Passage d’un assistant non compté :', erreur));
}
