# Design

Operate-mode side panel (about 400px wide). Tokens live in `src/sidepanel/styles.css`.

- **Theme:** follows the system via `light-dark()`. Warm off-white or olive-tinted graphite surfaces.
- **Accent:** one lime-green hue (oklch ~128 dark, ~135 light) used for the slash mark, command names, focus, and the send button. Nothing else is colored.
- **Type:** system UI + CJK fallbacks at 13.5px. Monospace only for command slugs (`/summarize`) and `kbd`.
- **Shape:** 12-14px for containers, 8px for rows and controls, pills only for chips.
- **Depth:** borders on the composer and menu; one soft shadow on the floating slash menu. No nested cards.
- **Motion:** a single 0.28s ease-out rise for new messages and the menu; disabled under `prefers-reduced-motion`.
- **Browser surfaces:** themed selection color, caret, scrollbar and focus ring.
