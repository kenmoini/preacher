import { describe, it, expect } from 'vitest';
import { deviceRepo } from '../../db/repositories/device.repo';

describe('deviceRepo', () => {
  const testDevice = { name: 'Test iPhone', apnsToken: 'abc123token', platform: 'ios' };

  describe('create', () => {
    it('creates a device and returns it with a registration token', () => {
      const { device, registrationToken } = deviceRepo.create(testDevice);

      expect(device.id).toBeDefined();
      expect(device.name).toBe('Test iPhone');
      expect(device.apns_token).toBe('abc123token');
      expect(device.platform).toBe('ios');
      expect(device.is_automation_server).toBe(0);
      expect(registrationToken).toHaveLength(64); // 32 bytes hex
    });

    it('generates unique IDs and registration tokens', () => {
      const d1 = deviceRepo.create({ name: 'Device 1', apnsToken: 'token1', platform: 'ios' });
      const d2 = deviceRepo.create({ name: 'Device 2', apnsToken: 'token2', platform: 'ios' });

      expect(d1.device.id).not.toBe(d2.device.id);
      expect(d1.registrationToken).not.toBe(d2.registrationToken);
    });
  });

  describe('findAll', () => {
    it('returns empty array when no devices exist', () => {
      expect(deviceRepo.findAll()).toEqual([]);
    });

    it('returns all devices', () => {
      deviceRepo.create({ name: 'First', apnsToken: 'tok1', platform: 'ios' });
      deviceRepo.create({ name: 'Second', apnsToken: 'tok2', platform: 'ios' });

      const devices = deviceRepo.findAll();
      expect(devices).toHaveLength(2);
      const names = devices.map(d => d.name).sort();
      expect(names).toEqual(['First', 'Second']);
    });
  });

  describe('findById', () => {
    it('returns the device when found', () => {
      const { device } = deviceRepo.create(testDevice);
      const found = deviceRepo.findById(device.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe('Test iPhone');
    });

    it('returns undefined for non-existent ID', () => {
      expect(deviceRepo.findById('non-existent')).toBeUndefined();
    });
  });

  describe('findByName', () => {
    it('finds a device by name', () => {
      deviceRepo.create(testDevice);
      const found = deviceRepo.findByName('Test iPhone');

      expect(found).toBeDefined();
      expect(found!.apns_token).toBe('abc123token');
    });

    it('returns undefined when name not found', () => {
      expect(deviceRepo.findByName('Nonexistent')).toBeUndefined();
    });
  });

  describe('findByNames', () => {
    it('returns empty array for empty input', () => {
      expect(deviceRepo.findByNames([])).toEqual([]);
    });

    it('returns matching devices', () => {
      deviceRepo.create({ name: 'Alpha', apnsToken: 'tok1', platform: 'ios' });
      deviceRepo.create({ name: 'Beta', apnsToken: 'tok2', platform: 'ios' });
      deviceRepo.create({ name: 'Gamma', apnsToken: 'tok3', platform: 'ios' });

      const found = deviceRepo.findByNames(['Alpha', 'Gamma']);
      expect(found).toHaveLength(2);
      const names = found.map(d => d.name).sort();
      expect(names).toEqual(['Alpha', 'Gamma']);
    });
  });

  describe('findByApnsToken', () => {
    it('finds a device by APNs token', () => {
      deviceRepo.create(testDevice);
      const found = deviceRepo.findByApnsToken('abc123token');

      expect(found).toBeDefined();
      expect(found!.name).toBe('Test iPhone');
    });
  });

  describe('findByRegistrationToken', () => {
    it('finds a device by registration token', () => {
      const { registrationToken } = deviceRepo.create(testDevice);
      const found = deviceRepo.findByRegistrationToken(registrationToken);

      expect(found).toBeDefined();
      expect(found!.name).toBe('Test iPhone');
    });
  });

  describe('findAutomationServers', () => {
    it('returns only automation server devices', () => {
      const { device } = deviceRepo.create(testDevice);
      deviceRepo.create({ name: 'Other', apnsToken: 'tok2', platform: 'ios' });
      deviceRepo.update(device.id, { isAutomationServer: true });

      const servers = deviceRepo.findAutomationServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('Test iPhone');
    });
  });

  describe('update', () => {
    it('updates device name', () => {
      const { device } = deviceRepo.create(testDevice);
      const updated = deviceRepo.update(device.id, { name: 'New Name' });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('New Name');
    });

    it('updates automation server flag', () => {
      const { device } = deviceRepo.create(testDevice);
      const updated = deviceRepo.update(device.id, { isAutomationServer: true });

      expect(updated!.is_automation_server).toBe(1);
    });

    it('returns undefined for non-existent device', () => {
      expect(deviceRepo.update('fake-id', { name: 'New' })).toBeUndefined();
    });

    it('returns existing device when no fields provided', () => {
      const { device } = deviceRepo.create(testDevice);
      const result = deviceRepo.update(device.id, {});
      expect(result).toBeDefined();
      expect(result!.name).toBe('Test iPhone');
    });
  });

  describe('updateLastSeen', () => {
    it('updates the last_seen_at timestamp', () => {
      const { device } = deviceRepo.create(testDevice);
      expect(device.last_seen_at).toBeNull();

      deviceRepo.updateLastSeen(device.id);
      const updated = deviceRepo.findById(device.id);
      expect(updated!.last_seen_at).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes the device and returns true', () => {
      const { device } = deviceRepo.create(testDevice);
      expect(deviceRepo.delete(device.id)).toBe(true);
      expect(deviceRepo.findById(device.id)).toBeUndefined();
    });

    it('returns false for non-existent device', () => {
      expect(deviceRepo.delete('non-existent')).toBe(false);
    });
  });
});
