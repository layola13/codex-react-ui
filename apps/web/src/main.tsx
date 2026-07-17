import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { App } from "./App";
import { createCodexTheme, isThemeId, type ThemeMode, type ThemePlugin } from "./theme";

const THEME_STORAGE_KEY = "codex-react-ui.theme-mode";
const CUSTOM_THEMES_KEY = "codex-react-ui.custom-theme-plugins";

function readCustomThemePlugins(): ThemePlugin[] {
  const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is ThemePlugin => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      return (
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.description === "string" &&
        entry.source === "user-defined" &&
        entry.preview &&
        typeof entry.preview.primary === "string" &&
        typeof entry.preview.secondary === "string" &&
        typeof entry.preview.background === "string"
      );
    });
  } catch {
    return [];
  }
}

function Root() {
  const [customThemePlugins, setCustomThemePlugins] = useState<ThemePlugin[]>(readCustomThemePlugins);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const customs = readCustomThemePlugins();
    if (stored === "black") return "official-black";
    if (stored === "light") return "official-light";
    return isThemeId(stored, customs) ? stored : "official-light";
  });
  const theme = useMemo(() => createCodexTheme(themeMode, customThemePlugins), [themeMode, customThemePlugins]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.dataset.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemePlugins));
  }, [customThemePlugins]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App
        themeMode={themeMode}
        customThemePlugins={customThemePlugins}
        onThemeModeChange={setThemeMode}
        onCustomThemePluginsChange={setCustomThemePlugins}
      />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
