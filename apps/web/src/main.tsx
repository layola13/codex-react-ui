import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { App } from "./App";
import { createCodexTheme, isThemeId, type ThemeMode } from "./theme";

const THEME_STORAGE_KEY = "codex-react-ui.theme-mode";

function Root() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "black") return "official-black";
    if (stored === "light") return "official-light";
    return isThemeId(stored) ? stored : "official-light";
  });
  const theme = useMemo(() => createCodexTheme(themeMode), [themeMode]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.dataset.colorScheme = themeMode;
  }, [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App themeMode={themeMode} onThemeModeChange={setThemeMode} />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
