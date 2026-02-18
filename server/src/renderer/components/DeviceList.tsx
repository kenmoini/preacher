import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface DeviceListProps {
  serverUrl: string;
}

interface Device {
  id: string;
  name: string;
  platform: string;
  isAutomationServer: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export default function DeviceList({ serverUrl }: DeviceListProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  const refresh = async () => {
    try {
      const data = await apiFetch<Device[]>('/devices');
      setDevices(data);
      const status = await window.electronAPI.getServerStatus();
      // We don't have connected IDs from status, so we just use count for now
      void status;
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutomation = async (device: Device) => {
    try {
      await apiFetch(`/devices/${device.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isAutomationServer: !device.isAutomationServer }),
      });
      refresh();
    } catch { /* ignore */ }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Remove this device?')) return;
    try {
      await apiFetch(`/devices/${id}`, { method: 'DELETE' });
      refresh();
    } catch { /* ignore */ }
  };

  const sendTest = async (id: string) => {
    try {
      await apiFetch('/config/apns/test', {
        method: 'POST',
        body: JSON.stringify({ deviceId: id }),
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Devices</h2>
        <span className="text-sm text-text-muted">{devices.length} registered</span>
      </div>

      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : devices.length === 0 ? (
        <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
          <p className="text-text-secondary">No devices registered yet.</p>
          <p className="text-text-muted text-sm mt-1">Install the Preacher app on an iOS device and connect it to <code className="font-mono">{serverUrl}</code></p>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Automation</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <tr key={device.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{device.name}</div>
                    <div className="text-xs text-text-muted font-mono">{device.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{device.platform}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAutomation(device)}
                      className={`text-xs px-2 py-1 rounded ${device.isAutomationServer ? 'bg-accent/20 text-accent' : 'bg-surface text-text-muted'}`}
                    >
                      {device.isAutomationServer ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => sendTest(device.id)} className="text-xs px-2 py-1 bg-surface text-text-secondary hover:text-text-primary rounded transition-colors">
                        Test
                      </button>
                      <button onClick={() => deleteDevice(device.id)} className="text-xs px-2 py-1 bg-surface text-danger hover:bg-danger/10 rounded transition-colors">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
