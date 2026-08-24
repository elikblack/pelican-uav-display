# Pelican UAV Display

Browser-based display graphics for the Pelican demo case.

## Targets

- Primary display: 1920×1080
- Secondary display: 1920×480 (8.8-inch ultrawide)
- Intended for Firefox/Safari on Apple Silicon and screen recording

## Design goals

- Dark military / restrained glass-cockpit aesthetic
- Static fictional satellite terrain with animated route preview
- Editable labels, icons, colors, timing, waypoint data, and map motion
- Plain HTML/CSS/JavaScript with no build step

## Structure

- `index.html` — primary 1080p display
- `secondary.html` — 1920×480 secondary display placeholder / next view
- `styles.css` — shared visual language
- `config.js` — editable text, colors, route, waypoints, timing, map settings
- `app.js` — primary display rendering and animation
- `secondary.js` — secondary display entry point
- `assets/` — terrain and other image assets

## Controls

- `Space` — pause/resume animation
- `R` — restart route preview

## Next

1. Add oversized fictional arid satellite terrain asset.
2. Dial in the primary 1080p layout and route animation.
3. Build the 1920×480 secondary display using the same shared visual language.
