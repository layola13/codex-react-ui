import type { ThemePlugin } from "./types";

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
    id: "atmospheric-codex",
    name: "Atmospheric Codex",
    description: "Mint green Soccer Stadium brand direction with glassmorphic layers.",
    source: "official",
    installedByDefault: true,
    preview: { primary: "#00361a", secondary: "#5a605d", background: "#f8faf5" }
  },
  {
    id: "sakura-pink",
    name: "Sakura Pink",
    description: "Serene cherry blossom theme featuring soft rose surfaces and shadows.",
    source: "official",
    installedByDefault: true,
    preview: { primary: "#d46b7a", secondary: "#8e5e6e", background: "#fbf2f4" }
  },
  {
    id: "developer-leaf",
    name: "Developer (Hidden Leaf)",
    description: "Charcoal workspace with vibrant Fox Spirit orange accents.",
    source: "official",
    installedByDefault: true,
    preview: { primary: "#d97736", secondary: "#5a605d", background: "#12100e" },
    dark: true
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

export const grey = {
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
