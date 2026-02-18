import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import DeviceList from './components/DeviceList';
import NotificationComposer from './components/NotificationComposer';
import ApiKeyManager from './components/ApiKeyManager';
import ActionManager from './components/ActionManager';
import Settings from './components/Settings';

export default function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const url = await window.electronAPI.getServerUrl();
      setServerUrl(url);

      try {
        const status = await window.electronAPI.getServerStatus();
        setNeedsSetup(!status.apnsConfigured || status.totalApiKeys === 0);
      } catch {
        setNeedsSetup(true);
      }
    })();
  }, []);

  if (needsSetup === null || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupWizard serverUrl={serverUrl} onComplete={() => setNeedsSetup(false)} />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard serverUrl={serverUrl} />} />
          <Route path="/devices" element={<DeviceList serverUrl={serverUrl} />} />
          <Route path="/notifications" element={<NotificationComposer serverUrl={serverUrl} />} />
          <Route path="/api-keys" element={<ApiKeyManager serverUrl={serverUrl} />} />
          <Route path="/actions" element={<ActionManager serverUrl={serverUrl} />} />
          <Route path="/settings" element={<Settings serverUrl={serverUrl} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
