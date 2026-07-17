import { alpha, createTheme } from "@mui/material/styles";

export type ThemeId = "official-light" | "official-black" | "dream-rose" | "studio-black-gold" | "glass-blue";
export type ThemeMode = ThemeId;

export type ThemePlugin = {
  id: ThemeId;
  name: string;
  description: string;
  source: "official" | "local-plugin" | "customer-slot";
  installedByDefault: boolean;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
};

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
} as const;

type ThemePalette = {
  dark: boolean;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  defaultBg: string;
  paper: string;
  panel: string;
  textPrimary: string;
  textSecondary: string;
  dividerBase: string;
  contrastText: string;
};

export const themePlugins: ThemePlugin[] = [
  {
    id: "official-light",
    name: "Official Light",
    description: "Clean Minimal/MUI-inspired default for daily work.",
    source: "official",
    installedByDefault: true,
    preview: { primary: "#1877F2", secondary: "#8E33FF", background: "#F4F6F8" }
  },
  {
    id: "official-black",
    name: "Official Black",
    description: "Dark workbench with cyan accents and high contrast code surfaces.",
    source: "official",
    installedByDefault: true,
    preview: { primary: "#61F3F3", secondary: "#FFAB00", background: "#070A0E" }
  },
  {
    id: "dream-rose",
    name: "Dream Rose",
    description: "Soft rose skin plugin inspired by local Dream Skin concepts.",
    source: "local-plugin",
    installedByDefault: false,
    preview: { primary: "#D84F7A", secondary: "#B76E79", background: "#FFF7F8" }
  },
  {
    id: "studio-black-gold",
    name: "Studio Black Gold",
    description: "Warm studio skin for low-light work with gold controls.",
    source: "local-plugin",
    installedByDefault: false,
    preview: { primary: "#D6A85D", secondary: "#8D6A3F", background: "#080706" }
  },
  {
    id: "glass-blue",
    name: "Glass Blue",
    description: "Cool translucent blue direction reserved for customer themes.",
    source: "customer-slot",
    installedByDefault: false,
    preview: { primary: "#38BDF8", secondary: "#7DD3FC", background: "#EEF8FF" }
  }
];

export function createCodexTheme(mode: ThemeMode) {
  const palette = themePalette(mode);
  const divider = alpha(palette.dividerBase, palette.dark ? 0.14 : 0.24);

  return createTheme({
    palette: {
      mode: palette.dark ? "dark" : "light",
      primary: {
        main: palette.primary,
        light: palette.primaryLight,
        dark: palette.primaryDark,
        contrastText: palette.contrastText
      },
      secondary: {
        main: palette.secondary,
        light: palette.secondaryLight,
        dark: palette.secondaryDark,
        contrastText: palette.dark ? "#1C252E" : "#FFFFFF"
      },
      info: { main: "#00B8D9" },
      success: { main: "#22C55E" },
      warning: { main: "#FFAB00" },
      error: { main: "#FF5630" },
      grey,
      background: {
        default: palette.defaultBg,
        paper: palette.paper
      },
      text: {
        primary: palette.textPrimary,
        secondary: palette.textSecondary
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
            backgroundColor: palette.defaultBg
          },
          "*": {
            boxSizing: "border-box"
          },
          "*::-webkit-scrollbar": {
            width: 10,
            height: 10
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(palette.dark ? "#FFFFFF" : "#637381", 0.24),
            borderRadius: 999,
            border: `2px solid ${palette.defaultBg}`
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
            boxShadow: `0 8px 20px ${alpha(palette.primary, palette.dark ? 0.18 : 0.22)}`
          },
          outlined: {
            backgroundColor: palette.panel
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
              backgroundColor: alpha(palette.primary, palette.dark ? 0.16 : 0.08)
            },
            "&.Mui-selected:hover": {
              backgroundColor: alpha(palette.primary, palette.dark ? 0.2 : 0.12)
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
            backgroundColor: palette.panel,
            borderRadius: 8
          },
          notchedOutline: {
            borderColor: alpha(palette.dividerBase, palette.dark ? 0.18 : 0.32)
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

export function installedThemePluginDefaults(): ThemeId[] {
  return themePlugins.filter((plugin) => plugin.installedByDefault).map((plugin) => plugin.id);
}

export function isThemeId(value: string | null): value is ThemeId {
  return Boolean(value && themePlugins.some((plugin) => plugin.id === value));
}

function themePalette(mode: ThemeMode): ThemePalette {
  switch (mode) {
    case "official-black":
      return {
        dark: true,
        primary: "#61F3F3",
        primaryLight: "#CAFDF5",
        primaryDark: "#00B8D9",
        secondary: "#FFAB00",
        secondaryLight: "#FFD666",
        secondaryDark: "#B76E00",
        defaultBg: "#070A0E",
        paper: "#10161D",
        panel: "#0D1218",
        textPrimary: "#F9FAFB",
        textSecondary: "#A8B3BF",
        dividerBase: "#FFFFFF",
        contrastText: "#06202A"
      };
    case "dream-rose":
      return {
        dark: false,
        primary: "#D84F7A",
        primaryLight: "#F7B9C8",
        primaryDark: "#9E2F55",
        secondary: "#8E5E6E",
        secondaryLight: "#D9A4B4",
        secondaryDark: "#6D3748",
        defaultBg: "#FFF7F8",
        paper: "#FFFFFF",
        panel: "#FFFDFD",
        textPrimary: "#2F2028",
        textSecondary: "#7B5F68",
        dividerBase: "#D9A4B4",
        contrastText: "#FFFFFF"
      };
    case "studio-black-gold":
      return {
        dark: true,
        primary: "#D6A85D",
        primaryLight: "#F1D29A",
        primaryDark: "#8D6A3F",
        secondary: "#8B5E34",
        secondaryLight: "#C99A64",
        secondaryDark: "#5C391D",
        defaultBg: "#080706",
        paper: "#15110D",
        panel: "#1B1510",
        textPrimary: "#FFF7E8",
        textSecondary: "#C8B89C",
        dividerBase: "#F1D29A",
        contrastText: "#15110D"
      };
    case "glass-blue":
      return {
        dark: false,
        primary: "#0284C7",
        primaryLight: "#7DD3FC",
        primaryDark: "#075985",
        secondary: "#2563EB",
        secondaryLight: "#93C5FD",
        secondaryDark: "#1D4ED8",
        defaultBg: "#EEF8FF",
        paper: "#FFFFFF",
        panel: "#F8FCFF",
        textPrimary: "#102033",
        textSecondary: "#52677D",
        dividerBase: "#93C5FD",
        contrastText: "#FFFFFF"
      };
    case "official-light":
    default:
      return {
        dark: false,
        primary: "#1877F2",
        primaryLight: "#73BAFB",
        primaryDark: "#0C44AE",
        secondary: "#8E33FF",
        secondaryLight: "#C684FF",
        secondaryDark: "#5119B7",
        defaultBg: "#F4F6F8",
        paper: "#FFFFFF",
        panel: "#FFFFFF",
        textPrimary: "#1C252E",
        textSecondary: "#637381",
        dividerBase: "#919EAB",
        contrastText: "#FFFFFF"
      };
  }
}
