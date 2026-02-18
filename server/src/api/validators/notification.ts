import { z } from 'zod';

const UrlBackgroundOptionsSchema = z.object({
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  httpContentType: z.string().optional(),
  httpBody: z.string().optional(),
});

const ActionSchema = z.object({
  name: z.string().min(1),
  input: z.string().optional(),
  keepNotification: z.boolean().optional(),
  shortcut: z.string().optional(),
  homekit: z.string().optional(),
  runOnServer: z.boolean().optional(),
  url: z.string().url().optional(),
  urlBackgroundOptions: UrlBackgroundOptionsSchema.optional(),
});

export const NotificationPayloadSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  sound: z.enum([
    'vibrateOnly', 'system', 'subtle', 'question',
    'jobDone', 'problem', 'loud', 'lasers',
  ]).optional(),
  image: z.string().url().optional(),
  imageData: z.string().optional(),
  input: z.string().optional(),
  devices: z.array(z.string()).optional(),
  isTimeSensitive: z.boolean().optional(),
  delay: z.number().min(0).optional(),
  scheduleTimestamp: z.number().optional(),
  id: z.string().optional(),
  threadId: z.string().optional(),
  defaultAction: ActionSchema.optional(),
  actions: z.array(ActionSchema).max(4).optional(),
});

export const NotificationDefinitionCreateSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().optional(),
  text: z.string().optional(),
  sound: z.enum([
    'vibrateOnly', 'system', 'subtle', 'question',
    'jobDone', 'problem', 'loud', 'lasers',
  ]).optional(),
  imageUrl: z.string().url().optional(),
  isTimeSensitive: z.boolean().optional(),
  defaultAction: ActionSchema.optional(),
  actions: z.array(ActionSchema).max(4).optional(),
  threadId: z.string().optional(),
  targetDevices: z.array(z.string()).optional(),
});

export const NotificationDefinitionUpdateSchema = NotificationDefinitionCreateSchema.partial();

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
export type NotificationDefinitionCreate = z.infer<typeof NotificationDefinitionCreateSchema>;
