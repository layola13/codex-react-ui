export type BuiltinThemeId =
  | "official-light"
  | "official-black"
  | "dream-rose"
  | "studio-black-gold"
  | "glass-blue"
  | "atmospheric-codex"
  | "sakura-pink"
  | "developer-leaf";

export type ThemeId = BuiltinThemeId | (string & {});
export type ThemeMode = ThemeId | "system";

export type ThemePlugin = {
  id: ThemeId;
  name: string;
  description: string;
  source: "official" | "local-plugin" | "customer-slot" | "user-defined";
  installedByDefault: boolean;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
  dark?: boolean;
  assets?: {
    appBackgroundImage?: string;
    heroImage?: string;
    cornerImage?: string;
    petImage?: string;
  };
  layout?: {
    heroEnabled?: boolean;
    petEnabled?: boolean;
    decorationIntensity?: "none" | "subtle" | "rich";
  };
};

export type ThemePalette = {
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
