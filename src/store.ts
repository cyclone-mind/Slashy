import { useCallback, useEffect, useState } from 'react';
import { BUILTIN_SKILLS } from './presets';
import type { Settings } from './types';

const KEY = 'slashy.settings';

export const DEFAULTS: Settings = { providers: [], activeProviderId: null, activeModel: null, skills: BUILTIN_SKILLS };

async function load(): Promise<Settings> {
  const got = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  return { ...DEFAULTS, ...got };
}

/** Settings persisted in chrome.storage.local, synced across panel instances. */
export function useSettings() {
  const [settings, setLocal] = useState<Settings | null>(null);

  useEffect(() => {
    load().then(setLocal);
    const on = (c: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && c[KEY]) setLocal({ ...DEFAULTS, ...c[KEY].newValue });
    };
    chrome.storage.onChanged.addListener(on);
    return () => chrome.storage.onChanged.removeListener(on);
  }, []);

  const update = useCallback((patch: (s: Settings) => Settings) => {
    setLocal(prev => {
      const next = patch(prev ?? DEFAULTS);
      chrome.storage.local.set({ [KEY]: next });
      return next;
    });
  }, []);

  return [settings, update] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
