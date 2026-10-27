import { z } from 'zod';

/* Lecture des notifications (F-81). La préférence d'e-mail est dans schemas/parametres.ts (F-06). */

/** Notifications marquées lues ou non lues : une seule, ou celles d'un « Tout marquer comme lu » annulé. */
export const schemaLectureNotifications = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  lue: z.boolean(),
});
export type LectureNotifications = z.output<typeof schemaLectureNotifications>;
