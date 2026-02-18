import { useState } from 'react';
import { setApiKey, apiFetch } from '../hooks/useApi';

interface SetupWizardProps {
  serverUrl: string;
  onComplete: () => void;
}

export default function SetupWizard({ serverUrl, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);

  // Step 0: Welcome
  // Step 1: APNs config
  // Step 2: Create API key
  // Step 3: Done

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Pulpit Setup</h1>
          <p className="text-text-secondary mt-2">Configure your push notification server</p>
          <div className="flex gap-2 justify-center mt-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        <div className="bg-surface-raised rounded-lg border border-border p-6">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} serverUrl={serverUrl} />}
          {step === 1 && <ApnsStep onNext={() => setStep(2)} />}
          {step === 2 && <ApiKeyStep onNext={() => setStep(3)} />}
          {step === 3 && <DoneStep onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext, serverUrl }: { onNext: () => void; serverUrl: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Welcome to Pulpit</h2>
      <p className="text-text-secondary text-sm">
        Pulpit is a self-hosted push notification server for iOS. To get started,
        you'll need to configure Apple Push Notification service (APNs) credentials
        and create an API key.
      </p>
      <div className="bg-surface p-3 rounded text-sm">
        <div className="text-text-muted">Server URL</div>
        <div className="text-text-primary font-mono">{serverUrl}</div>
      </div>
      <div className="text-text-secondary text-sm">
        <p className="font-medium mb-1">You'll need:</p>
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li>An Apple Developer account ($99/year)</li>
          <li>An APNs Authentication Key (.p8 file)</li>
          <li>Your Key ID and Team ID</li>
          <li>Your iOS app's Bundle ID</li>
        </ul>
      </div>
      <button onClick={onNext} className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded transition-colors">
        Get Started
      </button>
    </div>
  );
}

function ApnsStep({ onNext }: { onNext: () => void }) {
  const [keyPath, setKeyPath] = useState('');
  const [keyId, setKeyId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectFile = async () => {
    const path = await window.electronAPI.selectP8File();
    if (path) setKeyPath(path);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // Need a temporary API key to configure APNs
      // For initial setup, we create the key first via IPC
      const { key } = await window.electronAPI.createInitialApiKey('Setup Key');
      setApiKey(key);

      await apiFetch('/config/apns', {
        method: 'PUT',
        body: JSON.stringify({ keyPath, keyId, teamId, bundleId, isProduction }),
      });
      onNext();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isValid = keyPath && keyId.length === 10 && teamId.length === 10 && bundleId;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">APNs Configuration</h2>
      <p className="text-text-secondary text-sm">
        Upload your APNs authentication key and enter your credentials.
      </p>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Authentication Key (.p8)</label>
        <div className="flex gap-2">
          <input
            value={keyPath}
            readOnly
            placeholder="Select .p8 file..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
          />
          <button onClick={selectFile} className="px-3 py-2 bg-surface-overlay text-text-primary rounded text-sm hover:bg-border transition-colors">
            Browse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Key ID (10 chars)</label>
          <input
            value={keyId}
            onChange={e => setKeyId(e.target.value)}
            maxLength={10}
            placeholder="ABC123DEF4"
            className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Team ID (10 chars)</label>
          <input
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            maxLength={10}
            placeholder="TEAM123456"
            className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Bundle ID</label>
        <input
          value={bundleId}
          onChange={e => setBundleId(e.target.value)}
          placeholder="com.example.Preacher"
          className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={isProduction} onChange={e => setIsProduction(e.target.checked)} className="rounded" />
        Production environment (use sandbox for development)
      </label>

      {error && <div className="text-danger text-sm">{error}</div>}

      <button
        onClick={save}
        disabled={!isValid || saving}
        className="w-full py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}

function ApiKeyStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('Default');
  const [createdKey, setCreatedKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      const result = await apiFetch<{ key: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setCreatedKey(result.key);
      setApiKey(result.key);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Create API Key</h2>
      <p className="text-text-secondary text-sm">
        Create an API key for authenticating with the Pulpit API.
      </p>

      {!createdKey ? (
        <>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Key Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My API Key"
              className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary"
            />
          </div>
          {error && <div className="text-danger text-sm">{error}</div>}
          <button
            onClick={create}
            disabled={!name || creating}
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
          >
            {creating ? 'Creating...' : 'Create API Key'}
          </button>
        </>
      ) : (
        <>
          <div className="bg-surface p-3 rounded border border-warning/30">
            <p className="text-warning text-sm font-medium mb-2">Save this key - it won't be shown again!</p>
            <code className="text-xs text-text-primary break-all select-all">{createdKey}</code>
          </div>
          <button onClick={() => navigator.clipboard.writeText(createdKey)} className="w-full py-2 px-4 bg-surface-overlay text-text-primary rounded text-sm hover:bg-border transition-colors">
            Copy to Clipboard
          </button>
          <button onClick={onNext} className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded transition-colors">
            Continue
          </button>
        </>
      )}
    </div>
  );
}

function DoneStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <div className="text-4xl">&#10003;</div>
      <h2 className="text-xl font-semibold">Setup Complete!</h2>
      <p className="text-text-secondary text-sm">
        Pulpit is configured and ready to send push notifications.
        Install the Preacher app on your iOS device and connect it to this server.
      </p>
      <button onClick={onComplete} className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white rounded transition-colors">
        Open Dashboard
      </button>
    </div>
  );
}
