---
name: Nuxt Net Monitoring
description: Clear, compact network monitoring built on Nuxt UI's default semantic palette.
colors:
  primary: "var(--ui-primary)"
  neutral-bg: "var(--ui-bg)"
  surface-muted: "var(--ui-bg-muted)"
  text-default: "var(--ui-text)"
  text-muted: "var(--ui-text-muted)"
  text-toned: "var(--ui-text-toned)"
  border-default: "var(--ui-border)"
  border-muted: "var(--ui-border-muted)"
  success: "var(--ui-success)"
  warning: "var(--ui-warning)"
  error: "var(--ui-error)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "var(--ui-text-inverted)"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.text-default}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: Nuxt Net Monitoring

## Overview

**Creative North Star: "Clear Network Evidence"**

Nuxt Net Monitoring is a focused operational workspace for understanding network behavior. The interface uses Nuxt UI's default semantic palette as its source of truth so light and dark themes remain coherent, accessible, and easy to maintain.

The design is compact and evidence-first. Neutral surfaces establish hierarchy, primary color identifies interaction, and measurement colors explain download, upload, latency, warning, success, and error states. The product should feel dependable and readable rather than decorated.

**Key Characteristics:**
- Nuxt UI default semantic colors
- Compact headings, cards, and tables
- Clear state communication beyond color alone
- Responsive layouts that preserve readable data

## Colors

Use Nuxt UI semantic tokens for all interface chrome. Do not introduce a custom shell palette or hard-coded brand colors into the application theme.

### Primary
- **Primary** (`var(--ui-primary)`): Actions, links, selected controls, active navigation, and focus treatment.

### Secondary
- **Primary Signal** (`var(--ui-primary)`): Download and inbound throughput values.
- **Success** (`var(--ui-success)`): Upload and outbound throughput values.

### Tertiary
- **Error** (`var(--ui-error)`): Latency failures and degraded timing states.
- **Warning** (`var(--ui-warning)`): Pending, attention, and warning states.

### Neutral
- **Background** (`var(--ui-bg)`): Main application canvas.
- **Muted Surface** (`var(--ui-bg-muted)`): Secondary panels, status callouts, and chart regions.
- **Default Text** (`var(--ui-text)`): Primary content and metric values.
- **Muted Text** (`var(--ui-text-muted)`): Descriptions, timestamps, and supporting labels.
- **Toned Text** (`var(--ui-text-toned)`): Compact metadata.
- **Default Border** (`var(--ui-border)`): Structural separation for cards, fields, and tables.

**The Semantic Palette Rule.** Use Nuxt UI semantic tokens for surfaces, controls, measurements, and states. Do not hard-code interface colors in new screens.

## Typography

**Display Font:** Inter (with `system-ui`, sans-serif fallback)

**Body Font:** Inter (with `system-ui`, sans-serif fallback)

Use a 24px page title, 18px card title, 14px body, and 12px label scale. Keep page headers compact and aligned with chart and table card titles.

**The Evidence-First Type Rule.** Use weight and scale to clarify the next useful fact, not to inflate the interface.

## Layout

Use a centered responsive `UContainer` with Nuxt UI's standard header and predictable spacing rhythm. Prefer component defaults for card padding, control height, borders, and internal gaps rather than overriding slots for individual screens.

Dashboard toggles are centered without a separate divider. Tables preserve readable column widths with horizontal scrolling on narrow screens. Data grids expand at responsive breakpoints without changing the order of evidence.

## Elevation & Depth

The system is flat with tonal layering. Nuxt UI background, elevated, muted, and border tokens provide structure. Use shadows sparingly and never introduce gradients, glass effects, or decorative glow as default surface treatments.

**The Flat-by-Default Rule.** Borders and tonal surfaces establish hierarchy before shadows.

## Shapes

Use 8px rounding for cards, inputs, and standard controls; 6px for compact elements; and full rounding for status chips and indicators. Avoid turning every container into a pill.

## Components

### Header and Navigation
- **Style:** Use the Nuxt UI default header and navigation theme so both color modes remain consistent.
- **Labels:** Keep primary navigation concise: `Bandwidth`, `Speed Tests`, and `Settings`.
- **States:** Active, hover, and focus states must have sufficient contrast in both light and dark modes.

### Buttons
- **Primary:** Use the Nuxt UI primary color with compact 8px by 12px padding and 8px rounding.
- **Secondary:** Use Nuxt UI neutral outline, soft, or ghost variants.
- **Focus:** Preserve a visible focus ring and never rely on color alone.

### Cards / Tiles
- **Padding:** Use the Nuxt UI Card defaults (`p-4 sm:p-6`) unless a component's content genuinely requires another treatment.
- **Titles:** Use the Nuxt UI title and description slots for headings and subtitles.
- **Charts:** Let the chart component define its content height; do not alter card slot spacing to compensate.
- **Border:** Use the Nuxt UI default border and avoid decorative shadows.

### Tables and Status
- Right-align numeric columns and use tabular numerals.
- Preserve semantic Nuxt UI colors for download, upload, latency, and warnings.
- Pair every color state with text, an icon, or a status label.

## Do's and Don'ts

### Do:
- **Do** use Nuxt UI semantic tokens for all shared interface colors.
- **Do** preserve light/dark mode contrast for labels, alerts, controls, and navigation.
- **Do** keep cards compact and subtitle-led.
- **Do** use Nuxt UI semantic colors consistently and explain their meaning.
- **Do** preserve existing routes, workflows, filters, tables, and monitoring semantics.

### Don't:
- **Don't** add custom colors to the shared shell or measurement system.
- **Don't** use semantic colors as general-purpose decoration.
- **Don't** hide a meaningful state behind color alone.
- **Don't** inflate page titles or cards with excess whitespace.
- **Don't** use neon glow, glassmorphism, or terminal styling as visual shorthand.
