'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';

function getTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['class'] });
  function syncSavedTheme(event: StorageEvent) {
    if (event.storageArea !== window.localStorage || (event.key !== THEME_STORAGE_KEY && event.key !== null)) return;
    document.documentElement.classList.toggle('dark', event.newValue !== 'light');
  }

  window.addEventListener('storage', syncSavedTheme);
  return () => {
    observer.disconnect();
    window.removeEventListener('storage', syncSavedTheme);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => null);
  const isDark = theme !== 'light';

  function toggleTheme() {
    const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The toggle still works for this page when storage is unavailable.
    }
  }

  return { isDark, toggleTheme, mounted: theme !== null };
}
