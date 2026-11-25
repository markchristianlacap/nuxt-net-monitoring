# Signal Console design system

Nuxt Net Monitoring uses a focused **Signal Console** visual language: a quiet operational canvas for small IT teams investigating network performance over time.

## Principles

- **Evidence over decoration:** charts, measurements, timestamps, and device state are the visual priority.
- **Signal is the brand:** electric green identifies the monitoring system and healthy activity; it is not used as wallpaper.
- **Calm operations:** surfaces are restrained, readable, and optimized for repeated use on a trusted network.
- **One operational view:** bandwidth, speed tests, device state, and historical results share the same visual grammar.

## Tokens

Global tokens live in `app/assets/css/main.css`; Nuxt UI semantic colors are configured in `app/app.config.ts`.

- **Primary:** electric green (`#00DC82`) for active controls, healthy status, focus, and the signal mark.
- **Neutral:** slate for ink, canvas, borders, and elevated surfaces.
- **Data colors:** blue for download/input, green for upload/output, rose for latency/errors, amber for pending states.
- **Canvas:** `monitor-canvas` adds a very low-contrast 32px telemetry grid to operational pages.
- **Surfaces:** `monitor-surface` is the shared elevated panel treatment: a fine border, quiet background, and offset soft shadow.
- **Labels:** `monitor-label` is reserved for compact uppercase metadata and chart context.

## Layout

- The default layout owns the navigation shell and uses the telemetry canvas.
- The auth layout is a separate full-viewport surface with no application header.
- Page headers use a signal dot, strong title, supporting description, and right-aligned actions.
- Repeated data belongs in panels, not nested decorative cards.

## Components

- Use Nuxt UI for controls, forms, alerts, badges, tables, and navigation.
- Add `monitor-surface` when a panel needs the product-level elevated treatment.
- Use `monitor-label` for chart context and operational metadata.
- Keep status labels explicit: online/offline, running/scheduled, stale/unavailable, and error.
- Use icons from the Lucide collection; do not substitute text glyphs or emoji.

## Charts and measurements

- Chart headers identify the evidence being shown, such as “Historical throughput” or “Historical performance”.
- Download/input uses blue, upload/output uses green, and latency/error states use rose.
- Units remain visible in labels and values; numeric values use tabular figures where possible.
- Empty, stale, and unavailable states must explain what the operator can do next.

## Accessibility

- Preserve semantic headings, labels, live regions, and keyboard interaction.
- Focus rings use the electric-green signal color with a visible offset.
- Color is never the only indication of status; pair it with text or an icon.
- Maintain readable contrast in both light and dark modes.
