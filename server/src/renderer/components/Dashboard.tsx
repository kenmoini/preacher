import { useState, useEffect } from 'react';
import { apiFetch } from '../hooks/useApi';

interface DashboardProps {
  serverUrl: string;
}

interface LogEntry {
  id: string;
  title: string | null;
  text: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

export default function Dashboard({ serverUrl }: DashboardProps) {
  const [status, setStatus] = useState<{
    running: boolean;
    port: number;
    version: string;
    connectedDevices: number;
    apnsConfigured: boolean;
    totalDevices: number;
    totalApiKeys: number;
  } | null>(null);
  const [recentLog, setRecentLog] = useState<LogEntry[]>([]);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickText, setQuickText] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    try {
      const s = await window.electronAPI.getServerStatus();
      setStatus(s);
      const log = await apiFetch<{ entries: LogEntry[] }>('/log?limit=10');
      setRecentLog(log.entries);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendQuick = async () => {
    if (!quickTitle && !quickText) return;
    setSending(true);
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify({ title: quickTitle || undefined, text: quickText || undefined }),
      });
      setQuickTitle('');
      setQuickText('');
      refresh();
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Devices" value={status?.totalDevices ?? 0} />
        <StatCard label="Connected" value={status?.connectedDevices ?? 0} color="text-success" />
        <StatCard label="API Keys" value={status?.totalApiKeys ?? 0} />
        <StatCard label="APNs" value={status?.apnsConfigured ? 'Active' : 'Not Configured'} color={status?.apnsConfigured ? 'text-success' : 'text-warning'} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quick send */}
        <div className="bg-surface-raised rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide">Quick Send</h3>
          <input
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
          />
          <textarea
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            placeholder="Notification body"
            rows={2}
            className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary resize-none"
          />
          <button
            onClick={sendQuick}
            disabled={(!quickTitle && !quickText) || sending}
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded text-sm transition-colors"
          >
            {sending ? 'Sending...' : 'Send to All Devices'}
          </button>
        </div>

        {/* Recent log */}
        <div className="bg-surface-raised rounded-lg border border-border p-4">
          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">Recent Notifications</h3>
          {recentLog.length === 0 ? (
            <p className="text-text-muted text-sm">No notifications sent yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {recentLog.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <StatusDot status={entry.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{entry.title || entry.text || 'Untitled'}</div>
                    <div className="text-xs text-text-muted">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Server info */}
      <div className="bg-surface-raised rounded-lg border border-border p-4">
        <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-2">Server</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="text-text-muted">URL:</span> <span className="font-mono">{serverUrl}</span></div>
          <div><span className="text-text-muted">Version:</span> {status?.version}</div>
          <div><span className="text-text-muted">Status:</span> <span className="text-success">Running</span></div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-surface-raised rounded-lg border border-border p-4">
      <div className="text-text-muted text-xs uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color || 'text-text-primary'}`}>{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'sent' ? 'bg-success' : status === 'failed' ? 'bg-danger' : status === 'scheduled' ? 'bg-warning' : 'bg-text-muted';
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}
