import { z } from 'zod';

/* Lecture des notifications (F-81) et préférence d'e-mail (F-06, F-81). */

/** Notifications marquées lues ou non lues : une seule, ou celles d'un « Tout marquer comme lu » annulé. */
export const schemaLectureNotifications = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  lue: z.boolean(),
});
export type LectureNotifications = z.output<typeof schemaLectureNotifications>;

export const schemaPreferencesNotifications = z.object({ email: z.boolean() });
export type PreferencesNotifications = z.output<typeof schemaPreferencesNotifications>;
