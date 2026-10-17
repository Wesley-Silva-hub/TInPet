import { z } from 'zod'
import { paginationQuerySchema } from './common'

export const notificationTypes = [
  'POST_LIKE',
  'POST_COMMENT',
  'MATCH',
  'LOST_PET_NEARBY',
  'LOST_PET_SIGHTING',
  'LOST_PET_FOUND',
] as const
export const notificationTypeSchema = z.enum(notificationTypes)
export type NotificationType = z.infer<typeof notificationTypeSchema>

export const notificationSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  actor: z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }).nullable(),
  postId: z.uuid().nullable(),
  postImageUrl: z.string().nullable(),
  matchId: z.uuid().nullable(),
  petId: z.uuid().nullable(),
  alertId: z.uuid().nullable(),
  petName: z.string().nullable(),
  petPhotoUrl: z.string().nullable(),
  preview: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationsQuerySchema = paginationQuerySchema

export const unreadCountSchema = z.object({ unread: z.number().int() })
