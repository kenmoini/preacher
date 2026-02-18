import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface NotificationComposerProps {
  serverUrl: string;
}

interface Definition {
  id: string;
  name: string;
  title: string | null;
  text: string | null;
  sound: string;
  isTimeSensitive: boolean;
  actions: unknown[];
  createdAt: string;
}

export default function NotificationComposer({ serverUrl }: NotificationComposerProps) {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sound, setSound] = useState('system');
  const [creating, setCreating] = useState(false);

  // Send form
  const [sendTarget, setSendTarget] = useState<string | null>(null);
  const [sendTitle, setSendTitle] = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    try {
      const data = await apiFetch<Definition[]>('/notifications/definitions');
      setDefinitions(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createDefinition = async () => {
    setCreating(true);
    try {
      await apiFetch('/notifications/definitions', {
        method: 'POST',
        body: JSON.stringify({ name, title: title || undefined, text: text || undefined, sound }),
      });
      setName(''); setTitle(''); setText(''); setSound('system');
      setShowCreate(false);
      refresh();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const deleteDefinition = async (id: string) => {
    if (!confirm('Delete this notification template?')) return;
    try {
      await apiFetch(`/notifications/definitions/${id}`, { method: 'DELETE' });
      refresh();
    } catch { /* ignore */ }
  };

  const sendNotification = async (defName: string) => {
    setSending(true);
    try {
      await apiFetch(`/notifications/${defName}`, {
        method: 'POST',
        body: JSON.stringify({
          title: sendTitle || undefined,
          text: sendText || undefined,
        }),
      });
      setSendTarget(null);
      setSendTitle('');
      setSendText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifications</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Template'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create Notification Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Template Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="build-complete" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Sound</label>
              <select value={sound} onChange={e => setSound(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary">
                {['system', 'subtle', 'question', 'jobDone', 'problem', 'loud', 'lasers', 'vibrateOnly'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Default Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Build Complete" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Default Text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Your build finished successfully." rows={2} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary resize-none" />
          </div>
          <button
            onClick={createDefinition}
            disabled={!name || creating}
            className="py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded transition-colors"
          >
            {creating ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      )}

      {/* Send dialog */}
      {sendTarget && (
        <div className="bg-surface-raised rounded-lg border border-accent/30 p-4 space-y-3">
          <h3 className="font-semibold text-sm">Send: {sendTarget}</h3>
          <input value={sendTitle} onChange={e => setSendTitle(e.target.value)} placeholder="Override title (optional)" className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary" />
          <textarea value={sendText} onChange={e => setSendText(e.target.value)} placeholder="Override text (optional)" rows={2} className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={() => sendNotification(sendTarget)} disabled={sending} className="py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm rounded transition-colors">
              {sending ? 'Sending...' : 'Send Now'}
            </button>
            <button onClick={() => setSendTarget(null)} className="py-2 px-4 bg-surface-overlay text-text-secondary text-sm rounded hover:bg-border transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : definitions.length === 0 ? (
        <div className="bg-surface-raised rounded-lg border border-border p-8 text-center">
          <p className="text-text-secondary">No notification templates yet.</p>
          <p className="text-text-muted text-sm mt-1">Create a template to define reusable notification configurations.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {definitions.map(def => (
            <div key={def.id} className="bg-surface-raised rounded-lg border border-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{def.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {def.title && <span>{def.title}</span>}
                  {def.title && def.text && <span> - </span>}
                  {def.text && <span>{def.text}</span>}
                  {!def.title && !def.text && <span>No default content</span>}
                </div>
              </div>
              <div className="text-xs text-text-muted">{def.sound}</div>
              <div className="flex gap-2">
                <button onClick={() => setSendTarget(def.name)} className="text-xs px-3 py-1.5 bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors">
                  Send
                </button>
                <button onClick={() => deleteDefinition(def.id)} className="text-xs px-3 py-1.5 bg-surface text-danger hover:bg-danger/10 rounded transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API usage hint */}
      {definitions.length > 0 && (
        <div className="bg-surface-raised rounded-lg border border-border p-4">
          <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wide mb-2">API Usage</h3>
          <code className="text-xs text-text-secondary block">
            curl -X POST {serverUrl}/api/v1/notifications/{definitions[0].name} \<br />
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY" \<br />
            &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
            &nbsp;&nbsp;-d '{`{"title": "Hello", "text": "World"}`}'
          </code>
        </div>
      )}
    </div>
  );
}
