import { z } from 'zod';

export const DeviceRegisterSchema = z.object({
  name: z.string().min(1).max(100),
  apnsToken: z.string().min(1),
  platform: z.string().default('ios'),
});

export const DeviceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apnsToken: z.string().min(1).optional(),
  isAutomationServer: z.boolean().optional(),
});

export type DeviceRegister = z.infer<typeof DeviceRegisterSchema>;
export type DeviceUpdate = z.infer<typeof DeviceUpdateSchema>;
