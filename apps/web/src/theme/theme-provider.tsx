import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createCodexTheme } from "./create-theme";
import type { ThemeMode, ThemePlugin } from "./types";

type ThemeProviderProps = {
  themeMode: ThemeMode;
  customThemePlugins?: ThemePlugin[];
  children: ReactNode;
};

export function ThemeProvider({ themeMode, customThemePlugins = [], children }: ThemeProviderProps) {
  const theme = createCodexTheme(themeMode, customThemePlugins);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
