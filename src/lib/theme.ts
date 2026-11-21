export const THEME_STORAGE_KEY = 'theme';

// Run in the document head so the stored preference is applied before first paint.
export const initializeTheme = `
  try {
    const savedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  } catch {
    // Storage may be disabled. Keep the default theme.
  }
`;
