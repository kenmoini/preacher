import { Router } from 'express';
import { deviceRepo } from '../../db/repositories/device.repo';
import { DeviceRegisterSchema, DeviceUpdateSchema } from '../validators/device';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// List all devices (requires auth)
router.get('/devices', authMiddleware, (_req, res) => {
  const devices = deviceRepo.findAll();
  res.json(devices.map(d => ({
    id: d.id,
    name: d.name,
    platform: d.platform,
    isAutomationServer: !!d.is_automation_server,
    lastSeenAt: d.last_seen_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })));
});

// Register a new device (optional auth - iOS clients call this during setup)
router.post('/devices', optionalAuthMiddleware, (req, res) => {
  const data = DeviceRegisterSchema.parse(req.body);

  // Check if device already registered with this APNs token
  const existing = deviceRepo.findByApnsToken(data.apnsToken);
  if (existing) {
    // Update existing device and return its registration token
    deviceRepo.update(existing.id, { name: data.name, apnsToken: data.apnsToken });
    deviceRepo.updateLastSeen(existing.id);
    res.json({
      id: existing.id,
      registrationToken: existing.registration_token,
    });
    return;
  }

  const { device, registrationToken } = deviceRepo.create({
    name: data.name,
    apnsToken: data.apnsToken,
    platform: data.platform,
  });

  res.status(201).json({
    id: device.id,
    registrationToken,
  });
});

// Update a device (requires auth)
router.put('/devices/:id', authMiddleware, (req, res) => {
  const data = DeviceUpdateSchema.parse(req.body);
  const id = req.params.id as string;
  const device = deviceRepo.update(id, data);

  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  res.json({
    id: device.id,
    name: device.name,
    platform: device.platform,
    isAutomationServer: !!device.is_automation_server,
    lastSeenAt: device.last_seen_at,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  });
});

// Delete a device (requires auth)
router.delete('/devices/:id', authMiddleware, (req, res) => {
  const id = req.params.id as string;
  const deleted = deviceRepo.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }
  res.status(204).send();
});

export default router;
