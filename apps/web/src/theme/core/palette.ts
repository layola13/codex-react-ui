import type { ThemeMode, ThemePalette, ThemePlugin } from "../types";

function mix(color: string, target: string, amount: number): string {
  const from = parseHex(color);
  const to = parseHex(target);
  if (!from || !to) {
    return color;
  }
  const mixChannel = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[mixChannel(from[0], to[0]), mixChannel(from[1], to[1]), mixChannel(from[2], to[2])]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(value: string): [number, number, number] | null {
  const raw = value.trim().replace("#", "");
  if (raw.length === 3) {
    const channels = raw.split("").map((part) => parseInt(part + part, 16));
    if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return [channels[0]!, channels[1]!, channels[2]!];
  }
  if (raw.length !== 6) {
    return null;
  }
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }
  return [r, g, b];
}

export function themePaletteFromPlugin(plugin: ThemePlugin): ThemePalette {
  const dark = Boolean(plugin.dark);
  const primary = plugin.preview.primary;
  const secondary = plugin.preview.secondary;
  const background = plugin.preview.background;
  return {
    dark,
    primary,
    primaryLight: mix(primary, "#FFFFFF", 0.35),
    primaryDark: mix(primary, "#000000", 0.28),
    secondary,
    secondaryLight: mix(secondary, "#FFFFFF", 0.32),
    secondaryDark: mix(secondary, "#000000", 0.28),
    defaultBg: background,
    paper: dark ? mix(background, "#FFFFFF", 0.08) : "#FFFFFF",
    panel: dark ? mix(background, "#FFFFFF", 0.05) : mix(background, "#FFFFFF", 0.55),
    textPrimary: dark ? "#F9FAFB" : "#1C252E",
    textSecondary: dark ? "#A8B3BF" : "#637381",
    dividerBase: dark ? "#FFFFFF" : "#919EAB",
    contrastText: dark ? "#0B1220" : "#FFFFFF"
  };
}

export function themePalette(mode: ThemeMode, customPlugins: ThemePlugin[] = []): ThemePalette {
  const custom = customPlugins.find((plugin) => plugin.id === mode);
  if (custom) {
    return themePaletteFromPlugin(custom);
  }

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
    case "atmospheric-codex":
      return {
        dark: false,
        primary: "#00361a",
        primaryLight: "#9dd3aa",
        primaryDark: "#00210e",
        secondary: "#5a605d",
        secondaryLight: "#dfe4e1",
        secondaryDark: "#171d1b",
        defaultBg: "#f8faf5",
        paper: "#ffffff",
        panel: "#f3f4ef",
        textPrimary: "#191c19",
        textSecondary: "#414942",
        dividerBase: "#c1c9bf",
        contrastText: "#ffffff"
      };
    case "sakura-pink":
      return {
        dark: false,
        primary: "#d46b7a",
        primaryLight: "#ffb2bb",
        primaryDark: "#380b15",
        secondary: "#8e5e6e",
        secondaryLight: "#fcecee",
        secondaryDark: "#6d3748",
        defaultBg: "#fbf2f4",
        paper: "#ffffff",
        panel: "#faf0f2",
        textPrimary: "#3d2b2d",
        textSecondary: "#414942",
        dividerBase: "#c1c9bf",
        contrastText: "#ffffff"
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
