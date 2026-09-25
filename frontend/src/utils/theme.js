// Preferensi tema (dark/light) — murni preferensi tampilan, tetap di localStorage.

const THEME_KEY = 'nusaquest_theme';

// Get theme
export const getTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

// Save theme
export const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
};
