import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface ActionManagerProps {
  serverUrl: string;
}

interface Action {
  id: string;
  name: string;
  shortcutName: string | null;
  targetDeviceId: string | null;
  webhookUrl: string | null;
  timeoutSeconds: number;
  createdAt: string;
}

export default function ActionManager({ serverUrl }: ActionManagerProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [shortcutName, setShortcutName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [timeout, setTimeout_] = useState(30);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const data = await apiFetch<Action[]>('/actions');
      setActions(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createAction = async () => {
    setCreating(true);
    try {
      await apiFetch('/actions', {
        method: 'POST',
        body: JSON.stringify({
          name,
          shortcutName: shortcutName || undefined,
          webhookUrl: webhookUrl || undefined,
          timeoutSeconds: timeout,
        }),
      });
      setName(''); setShortcutName(''); setWebhookUrl(''); setTimeout_(30);
      setShowCreate(false);
      refresh();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const deleteAction = async (id: string) => {
    if (!confirm('Delete this action?')) return;
    try {
      await apiFetch(`/actions/${id}`, { method: 'DELETE' });
      refresh();
    } catch { /* ignore */ }
  };

  const testAction = async (actionName: string) => {
    try {
      await apiFetch('/execute', {
        method: 'POST',
        body: JSON.stringify({ action: actionName, nowait: true }),
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Actions</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Action'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create Server Action</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Action Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="deploy-prod" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Timeout (seconds)</label>
              <input type="number" value={timeout} onChange={e => setTimeout_(Number(e.target.value))} min={1} max={300} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">iOS Shortcut Name</label>
            <input value={shortcutName} onChange={e => setShortcutName(e.target.value)} placeholder="Deploy to Production" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Webhook URL (alternative to Shortcut)</label>
            <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
          </div>
          <button onClick={createAction} disabled={!name || creating} className="py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded transition-colors">
            {creating ? 'Creating...' : 'Create Action'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : actions.length === 0 ? (
        <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
          <p className="text-text-secondary">No server actions configured yet.</p>
          <p className="text-text-muted text-sm mt-1">Actions allow you to trigger iOS Shortcuts or webhooks remotely.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map(action => (
            <div key={action.id} className="bg-surface-raised rounded-lg border border-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{action.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {action.shortcutName && <span>Shortcut: {action.shortcutName}</span>}
                  {action.webhookUrl && <span>Webhook: {action.webhookUrl}</span>}
                  {!action.shortcutName && !action.webhookUrl && <span>No target configured</span>}
                </div>
              </div>
              <div className="text-xs text-text-muted">{action.timeoutSeconds}s</div>
              <div className="flex gap-2">
                <button onClick={() => testAction(action.name)} className="text-xs px-3 py-1.5 bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors">
                  Test
                </button>
                <button onClick={() => deleteAction(action.id)} className="text-xs px-3 py-1.5 bg-surface text-danger hover:bg-danger/10 rounded transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="bg-surface-raised rounded-lg border border-border p-4">
          <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wide mb-2">API Usage</h3>
          <code className="text-xs text-text-secondary block">
            curl -X POST {serverUrl}/api/v1/execute \<br />
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
            &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
            &nbsp;&nbsp;-d '{`{"action": "${actions[0].name}"}`}'
          </code>
        </div>
      )}
    </div>
  );
}
