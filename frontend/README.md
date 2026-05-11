# frontend

Vanilla HTML / CSS / JavaScript. No bundler, no compile step.

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173.

## Folder structure

| Path | Contents |
|---|---|
| `styles/` | Design tokens, base styles, utilities, components, main entry |
| `scripts/` | Shared JS (partials loader, theme, nav, cart, API client, page scripts) |
| `partials/` | `header.html`, `footer.html` — injected into every page |
| `assets/images/` | All product imagery and design mockups (All Rights Reserved, see /LICENSE-ART) |
| `assets/fonts/` | Self-hosted fonts (optional — MVP1 uses Google Fonts CDN) |
| `*.html` | The 11 public pages |

## CSS architecture

All component CSS reads from semantic tokens in `styles/tokens.css`. Never hardcode hex values.

Read the Master Spec § 7 (Visual System) before touching any CSS.

## JS architecture

All scripts are vanilla ES modules. No build step. Load them with `<script type="module" src="…"></script>`.
