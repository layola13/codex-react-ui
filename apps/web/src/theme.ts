import { alpha, createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "black";

const grey = {
  50: "#FCFDFD",
  100: "#F9FAFB",
  200: "#F4F6F8",
  300: "#DFE3E8",
  400: "#C4CDD5",
  500: "#919EAB",
  600: "#637381",
  700: "#454F5B",
  800: "#1C252E",
  900: "#141A21"
};

export function createCodexTheme(mode: ThemeMode) {
  const isBlack = mode === "black";
  const primary = isBlack ? "#61F3F3" : "#1877F2";
  const paper = isBlack ? "#10161D" : "#FFFFFF";
  const defaultBg = isBlack ? "#070A0E" : "#F4F6F8";
  const panel = isBlack ? "#0D1218" : "#FFFFFF";
  const divider = alpha(isBlack ? "#FFFFFF" : "#919EAB", isBlack ? 0.12 : 0.24);

  return createTheme({
    palette: {
      mode: isBlack ? "dark" : "light",
      primary: {
        main: primary,
        light: isBlack ? "#CAFDF5" : "#73BAFB",
        dark: isBlack ? "#00B8D9" : "#0C44AE",
        contrastText: isBlack ? "#06202A" : "#FFFFFF"
      },
      secondary: {
        main: isBlack ? "#FFAB00" : "#8E33FF",
        light: isBlack ? "#FFD666" : "#C684FF",
        dark: isBlack ? "#B76E00" : "#5119B7",
        contrastText: isBlack ? "#1C252E" : "#FFFFFF"
      },
      info: { main: "#00B8D9" },
      success: { main: "#22C55E" },
      warning: { main: "#FFAB00" },
      error: { main: "#FF5630" },
      grey,
      background: {
        default: defaultBg,
        paper
      },
      text: {
        primary: isBlack ? "#F9FAFB" : "#1C252E",
        secondary: isBlack ? "#A8B3BF" : "#637381"
      },
      divider
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily:
        'Inter, "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 750 },
      h4: { fontWeight: 750 },
      h5: { fontWeight: 750 },
      h6: { fontWeight: 700 },
      button: {
        textTransform: "none",
        fontWeight: 700
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: defaultBg
          },
          "*": {
            boxSizing: "border-box"
          },
          "*::-webkit-scrollbar": {
            width: 10,
            height: 10
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(isBlack ? "#FFFFFF" : "#637381", 0.24),
            borderRadius: 999,
            border: `2px solid ${defaultBg}`
          },
          "*::-webkit-scrollbar-track": {
            backgroundColor: "transparent"
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none"
          }
        }
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 34,
            borderRadius: 8,
            paddingInline: 12
          },
          contained: {
            boxShadow: "none"
          },
          containedPrimary: {
            boxShadow: `0 8px 20px ${alpha(primary, isBlack ? 0.18 : 0.22)}`
          },
          outlined: {
            backgroundColor: panel
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999
          }
        }
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: divider
          }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginInline: 6,
            marginBlock: 2,
            paddingBlock: 9,
            paddingInline: 10,
            "&.Mui-selected": {
              backgroundColor: alpha(primary, isBlack ? 0.16 : 0.08)
            },
            "&.Mui-selected:hover": {
              backgroundColor: alpha(primary, isBlack ? 0.2 : 0.12)
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 8
          },
          outlined: {
            borderColor: divider
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: panel,
            borderRadius: 8
          },
          notchedOutline: {
            borderColor: alpha(isBlack ? "#FFFFFF" : "#919EAB", isBlack ? 0.18 : 0.32)
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            display: "flex",
            alignItems: "center"
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            minHeight: 42,
            borderRadius: 8
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 42
          },
          indicator: {
            height: 3,
            borderRadius: 999
          }
        }
      }
    }
  });
}
