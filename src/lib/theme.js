import { useState, useEffect } from 'react';

const STORAGE_KEY = 'condica-theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  function toggleTheme() { setThemeState((t) => (t === 'dark' ? 'light' : 'dark')); }
  return { theme, toggleTheme };
}
