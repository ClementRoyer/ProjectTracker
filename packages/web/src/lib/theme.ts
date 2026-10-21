export type Theme = 'light' | 'dark';

const KEY = 'tracker-theme';

/** The theme the developer chose last, else the system's. Storage may be blocked: the page works without it. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // No storage: follow the system.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Kept only once the developer chose: until then the page follows the system. */
export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // No storage: the choice lasts until the page closes.
  }
}
