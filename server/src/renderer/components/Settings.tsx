import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface SettingsProps {
  serverUrl: string;
}

interface ApnsConfigInfo {
  configured: boolean;
  keyId?: string;
  teamId?: string;
  bundleId?: string;
  isProduction?: boolean;
  updatedAt?: string;
}

export default function Settings({ serverUrl }: SettingsProps) {
  const [apnsConfig, setApnsConfig] = useState<ApnsConfigInfo | null>(null);
  const [status, setStatus] = useState<{
    port: number;
    version: string;
    connectedDevices: number;
    totalDevices: number;
    totalApiKeys: number;
  } | null>(null);

  // APNs update form
  const [editing, setEditing] = useState(false);
  const [keyPath, setKeyPath] = useState('');
  const [keyId, setKeyId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const config = await apiFetch<ApnsConfigInfo>('/config/apns');
      setApnsConfig(config);
      if (config.configured) {
        setKeyId(config.keyId || '');
        setTeamId(config.teamId || '');
        setBundleId(config.bundleId || '');
        setIsProduction(config.isProduction || false);
      }
      const s = await window.electronAPI.getServerStatus();
      setStatus(s);
    } catch { /* ignore */ }
  };

  useEffect(() => { refresh(); }, []);

  const saveApns = async () => {
    setSaving(true);
    try {
      await apiFetch('/config/apns', {
        method: 'PUT',
        body: JSON.stringify({ keyPath, keyId, teamId, bundleId, isProduction }),
      });
      setEditing(false);
      refresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const selectFile = async () => {
    const path = await window.electronAPI.selectP8File();
    if (path) setKeyPath(path);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Server info */}
      <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide">Server</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-muted">URL:</span> <span className="font-mono">{serverUrl}</span></div>
          <div><span className="text-text-muted">Port:</span> {status?.port}</div>
          <div><span className="text-text-muted">Version:</span> {status?.version}</div>
          <div><span className="text-text-muted">Devices:</span> {status?.totalDevices} ({status?.connectedDevices} online)</div>
        </div>
      </div>

      {/* APNs config */}
      <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide">APNs Configuration</h3>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1.5 bg-surface text-text-secondary hover:text-text-primary rounded transition-colors"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-text-muted">Status:</span> <span className={apnsConfig?.configured ? 'text-success' : 'text-warning'}>{apnsConfig?.configured ? 'Configured' : 'Not Configured'}</span></div>
            <div><span className="text-text-muted">Environment:</span> {apnsConfig?.isProduction ? 'Production' : 'Sandbox'}</div>
            <div><span className="text-text-muted">Key ID:</span> {apnsConfig?.keyId || '-'}</div>
            <div><span className="text-text-muted">Team ID:</span> {apnsConfig?.teamId || '-'}</div>
            <div><span className="text-text-muted">Bundle ID:</span> {apnsConfig?.bundleId || '-'}</div>
            {apnsConfig?.updatedAt && <div><span className="text-text-muted">Updated:</span> {new Date(apnsConfig.updatedAt).toLocaleString()}</div>}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Authentication Key (.p8)</label>
              <div className="flex gap-2">
                <input value={keyPath} readOnly placeholder="Select .p8 file..." className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
                <button onClick={selectFile} className="px-3 py-2 bg-surface-overlay text-text-primary rounded text-sm hover:bg-border transition-colors">Browse</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Key ID</label>
                <input value={keyId} onChange={e => setKeyId(e.target.value)} maxLength={10} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Team ID</label>
                <input value={teamId} onChange={e => setTeamId(e.target.value)} maxLength={10} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bundle ID</label>
              <input value={bundleId} onChange={e => setBundleId(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={isProduction} onChange={e => setIsProduction(e.target.checked)} />
              Production environment
            </label>
            <button onClick={saveApns} disabled={!keyPath || !keyId || !teamId || !bundleId || saving} className="py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* iOS Setup Instructions */}
      <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide">iOS Device Setup</h3>
        <p className="text-sm text-text-muted">
          To connect an iOS device, install the Preacher app and enter this server URL:
        </p>
        <div className="bg-surface p-3 rounded">
          <code className="text-sm text-text-primary select-all">{serverUrl}</code>
        </div>
      </div>
    </div>
  );
}
