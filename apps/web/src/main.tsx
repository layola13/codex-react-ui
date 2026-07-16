import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { App } from "./App";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#145c72" },
    secondary: { main: "#705c18" },
    background: {
      default: "#f6f7f9",
      paper: "#ffffff"
    },
    success: { main: "#256d3b" },
    warning: { main: "#a05a00" },
    error: { main: "#a83232" }
  },
  shape: {
    borderRadius: 6
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 650
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 36
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6
        }
      }
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

