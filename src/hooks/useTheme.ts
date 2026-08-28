import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'assurzen-theme';

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemDark();
}

function applyClass(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
}

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

/** Apply theme ASAP (call before React mount to avoid flash) */
export function initTheme() {
  const mode = readStored();
  applyClass(resolveDark(mode));
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => readStored());
  const [isDark, setIsDark] = useState(() => resolveDark(readStored()));

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const dark = resolveDark(next);
    setIsDark(dark);
    applyClass(dark);
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  // Sync with system when mode === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (mode === 'system') {
        const dark = mq.matches;
        setIsDark(dark);
        applyClass(dark);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  // Ensure class is applied on mount
  useEffect(() => {
    applyClass(resolveDark(mode));
  }, [mode]);

  return { mode, setMode, isDark, toggle };
}
