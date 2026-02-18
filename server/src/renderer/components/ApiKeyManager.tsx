import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface ApiKeyManagerProps {
  serverUrl: string;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeyManager({ serverUrl }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState('');

  const refresh = async () => {
    try {
      const data = await apiFetch<ApiKeyInfo[]>('/api-keys');
      setKeys(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createKey = async () => {
    setCreating(true);
    try {
      const result = await apiFetch<{ id: string; key: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewKey(result.key);
      setName('');
      refresh();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiFetch(`/api-keys/${id}`, { method: 'DELETE' });
      refresh();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setNewKey(''); }}
          className="px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Key'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
          {!newKey ? (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1">Key Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="CI/CD Pipeline" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
              </div>
              <button onClick={createKey} disabled={!name || creating} className="py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded transition-colors">
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </>
          ) : (
            <>
              <div className="bg-surface p-3 rounded border border-warning/30">
                <p className="text-warning text-sm font-medium mb-2">Save this key - it won't be shown again!</p>
                <code className="text-xs text-text-primary break-all select-all">{newKey}</code>
              </div>
              <button onClick={() => navigator.clipboard.writeText(newKey)} className="py-2 px-4 bg-surface-overlay text-text-secondary text-sm rounded hover:bg-border transition-colors">
                Copy to Clipboard
              </button>
            </>
          )}
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
          <p className="text-text-secondary">No API keys created yet.</p>
        </div>
      ) : (
        <div className="bg-surface-raised rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{key.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-text-muted">{key.keyPrefix}...</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${key.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteKey(key.id)} className="text-xs px-2 py-1 bg-surface text-danger hover:bg-danger/10 rounded transition-colors">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage hint */}
      <div className="bg-surface-raised rounded-lg border border-border p-4">
        <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wide mb-2">Authentication</h3>
        <code className="text-xs text-text-secondary">
          Authorization: Bearer pk_your_api_key_here
        </code>
      </div>
    </div>
  );
}
