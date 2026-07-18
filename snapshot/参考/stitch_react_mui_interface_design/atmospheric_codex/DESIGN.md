---
name: Atmospheric Codex
colors:
  surface: '#f8faf5'
  surface-dim: '#d9dbd6'
  surface-bright: '#f8faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4ef'
  surface-container: '#edeee9'
  surface-container-high: '#e7e9e4'
  surface-container-highest: '#e1e3de'
  on-surface: '#191c19'
  on-surface-variant: '#414942'
  inverse-surface: '#2e312e'
  inverse-on-surface: '#f0f1ec'
  outline: '#717971'
  outline-variant: '#c1c9bf'
  surface-tint: '#366847'
  primary: '#00361a'
  on-primary: '#ffffff'
  primary-container: '#1a4d2e'
  on-primary-container: '#88bd95'
  inverse-primary: '#9dd3aa'
  secondary: '#5a605d'
  on-secondary: '#ffffff'
  secondary-container: '#dce1de'
  on-secondary-container: '#5e6462'
  tertiary: '#4f1c26'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a323b'
  on-tertiary-container: '#e89ca5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b8f0c5'
  primary-fixed-dim: '#9dd3aa'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#1d5031'
  secondary-fixed: '#dfe4e1'
  secondary-fixed-dim: '#c2c8c5'
  on-secondary-fixed: '#171d1b'
  on-secondary-fixed-variant: '#424846'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bb'
  on-tertiary-fixed: '#380b15'
  on-tertiary-fixed-variant: '#6e353e'
  background: '#f8faf5'
  on-background: '#191c19'
  surface-variant: '#e1e3de'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  nav-item:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 260px
  container_padding: 32px
  card_gutter: 24px
  section_gap: 40px
  input_padding: 16px 24px
---

## Brand & Style

This design system is built on the principle of **Immersive Theming**, where the UI acts as a canvas for the user's current context—ranging from high-energy sports to serene creative spaces or technical developer environments. The core personality is **adaptable, expansive, and high-fidelity**.

The visual language blends **Minimalism** (for structural clarity) with **Glassmorphism** (for depth and immersion). By utilizing large-scale background imagery and translucent MUI surface containers, the UI feels lightweight yet deeply integrated into its chosen theme. Key characteristics include:
- **Atmospheric Depth:** Layered surfaces with varying opacity levels allow background motifs to bleed through.
- **Dynamic Energetics:** Motion and color transitions that respond to theme switches.
- **Content-First Hierarchy:** Large hero areas and structured grids that prioritize visual storytelling over dense data tables.

## Colors

The palette strategy revolves around a **Primary-Surface-Accent** triad. Each theme defines a specific personality:
- **Soccer:** Deep stadium greens with high-contrast white surfaces and trophy gold accents.
- **Sakura:** A monochromatic range of dusty rose and petal pinks, utilizing low-contrast shadows.
- **Developer:** A "Hidden Leaf" aesthetic featuring deep charcoal backgrounds with vibrant orange (Fox Spirit) functional accents.
- **Personal:** A clean, high-key light pink palette that emphasizes negative space and soft shadows.

Surface colors should be applied with `0.85` opacity in glassmorphic containers to maintain legibility while preserving the "Codex" atmospheric background.

## Typography

The typography system balances modern accessibility with technical precision.
- **Headlines:** Use **Plus Jakarta Sans** for its friendly yet geometric profile. Tighten letter spacing for large display text (H1/H2).
- **Body Text:** Use **Manrope** for superior readability in chat prompts and content cards.
- **Technical/Meta Labels:** Use **JetBrains Mono** for developer-themed data, timestamps, or secondary metadata to lean into the "Codex" technical aspect.

**Responsive Adjustments:** On mobile, scale H1 down to 32px and H2 to 24px. Maintain body sizes but increase line-height slightly for better touch-target legibility.

## Layout & Spacing

The layout utilizes a **Fixed Sidebar / Fluid Content** model.
- **Sidebar:** Positioned to the left, acting as the structural anchor. It uses a 260px fixed width with vertical navigation groups.
- **Main Content:** A fluid grid system with a maximum 1600px breakpoint. Layout is driven by horizontal "lanes" (Hero, Widgets, Feed).
- **Safe Zones:** A universal 32px margin around the main viewport prevents content from feeling crowded against the screen edges.
- **Component Rhythms:** Use 8px increments (base unit). For example, 24px between cards, 40px between major sections like "Project" and "Task" groups.

## Elevation & Depth

Hierarchy is established through **Surface Opacity and Backdrop Blurs** rather than traditional heavy shadows.

- **Level 1 (Base):** The background theme image/gradient.
- **Level 2 (Panels):** Sidebar and Main Surface areas. Use `backdrop-filter: blur(20px)` with a theme-tinted semi-transparent background (`rgba(..., 0.8)`).
- **Level 3 (Interactive):** Cards and Input fields. These use a slightly higher opacity or a subtle white/light-tint inner stroke (1px) to "pop" from the panel.
- **Level 4 (Modals/Popovers):** Standard MUI shadows with a `0.12` opacity, tinted with the primary color to ensure they feel part of the specific theme.

## Shapes

The design system favors **Generous Roundedness** to evoke a friendly, modern app experience.
- **Base Components:** Buttons and small inputs use a 0.5rem (8px) radius.
- **Primary Containers:** Main content cards and navigation panels must use a minimum of 1.5rem (24px) radius.
- **Search & Prompts:** The main bottom "Chat-style" input bar should use a fully pill-shaped (100px) radius to distinguish it from the content cards above.
- **Visual Accents:** Image thumbnails within cards should follow the 16px (rounded-lg) rule.

## Components

### Navigation (MUI Drawer/List)
The sidebar uses `MuiListItemButton` with a 12px horizontal padding. Icons are 20px, paired with `nav-item` typography. Active states use a theme-specific "indicator" (e.g., a small dot or a left-side vertical bar in the primary color).

### Cards (MUI Card)
Cards are the primary container. They feature a 1px border using `theme.palette.divider` at 0.1 opacity. For the "Sakura" and "Soccer" themes, cards may include background image patterns (floral or grass blades) at 5% opacity.

### Action Bar (Chat Input)
A specialized MUI Box component anchored to the bottom.
- **Background:** High-blur glassmorphism.
- **Internal Buttons:** Icon-only buttons for "Plus", "Microphone", and "Settings".
- **Primary Action:** The "Send" or "Apply" button is a floating action style circular button with a heavy theme-colored fill.

### Chips & Badges
Small status indicators use the `label-caps` typography. They should have a background opacity of 0.2 of the primary color with a 100% opacity text for maximum readability without visual weight.

### Inputs (MUI TextField)
Standardize on the "Outlined" variant but remove the default border in favor of a soft background fill. Use 16px vertical padding for search bars to create a "breathable" touch area.