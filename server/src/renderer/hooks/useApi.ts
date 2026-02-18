import { useState, useCallback } from 'react';

let cachedServerUrl: string | null = null;
let cachedApiKey: string | null = null;

export function setApiKey(key: string) {
  cachedApiKey = key;
  localStorage.setItem('pulpit_api_key', key);
}

export function getApiKey(): string | null {
  if (!cachedApiKey) {
    cachedApiKey = localStorage.getItem('pulpit_api_key');
  }
  return cachedApiKey;
}

async function getServerUrl(): Promise<string> {
  if (!cachedServerUrl) {
    cachedServerUrl = await window.electronAPI.getServerUrl();
  }
  return cachedServerUrl;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const serverUrl = await getServerUrl();
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${serverUrl}/api/v1${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function useApiQuery<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(path);
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  return { data, loading, error, refresh };
}
