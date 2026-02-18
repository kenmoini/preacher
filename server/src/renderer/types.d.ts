interface ElectronAPI {
  selectP8File: () => Promise<string | null>;
  getServerUrl: () => Promise<string>;
  getServerStatus: () => Promise<{
    running: boolean;
    port: number;
    version: string;
    connectedDevices: number;
    apnsConfigured: boolean;
    totalDevices: number;
    totalApiKeys: number;
  }>;
  createInitialApiKey: (name: string) => Promise<{
    id: string;
    name: string;
    key: string;
  }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
