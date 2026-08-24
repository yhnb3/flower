export const themeStorageKey = "hwa-planner-theme";

const supportedThemes = new Set(["light", "navy", "mauve"]);

export function readStoredTheme(storage = globalThis.localStorage) {
  try {
    const storedTheme = storage?.getItem?.(themeStorageKey);
    return supportedThemes.has(storedTheme) ? storedTheme : "light";
  } catch {
    return "light";
  }
}

export function writeStoredTheme(theme, storage = globalThis.localStorage) {
  if (!supportedThemes.has(theme)) return false;

  try {
    storage?.setItem?.(themeStorageKey, theme);
    return Boolean(storage?.setItem);
  } catch {
    return false;
  }
}
