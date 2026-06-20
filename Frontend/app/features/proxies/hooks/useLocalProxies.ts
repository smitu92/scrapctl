import { useState, useCallback } from "react";

const STORAGE_KEY = "scrapctl_user_proxies";

export interface LocalProxy {
  id: string; // unique ID = ip:port
  ip: string;
  port: string;
  username?: string;
  password?: string;
  protocol: string;
  status: string; // PENDING | ACTIVE | DEAD
  latency?: number;
  last_checked?: string;
  raw_string: string;
  error_code?: number;
}

function loadFromStorage(): LocalProxy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(proxies: LocalProxy[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proxies));
}

export function useLocalProxies() {
  const [proxies, setProxies] = useState<LocalProxy[]>(() => loadFromStorage());

  const addBulk = useCallback((newProxies: LocalProxy[]) => {
    setProxies(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const unique = newProxies.filter(p => !existingIds.has(p.id));
      const updated = [...prev, ...unique];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateProxy = useCallback((id: string, updates: Partial<LocalProxy>) => {
    setProxies(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeProxy = useCallback((id: string) => {
    setProxies(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setProxies([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { proxies, addBulk, updateProxy, removeProxy, clearAll };
}
