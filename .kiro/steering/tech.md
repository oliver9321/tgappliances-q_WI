# Tech Stack

## Runtime & Language
- **Vanilla JavaScript** (ES modules) — `main.js` is the primary script
- **HTML5** — `index.html` is the single-page entry point
- **CSS3** — `style.css` handles all styling (no CSS preprocessor)

## Build System
- **Vite 6** with `@vitejs/plugin-react` (React plugin loaded but React is not actively used in the UI — the site is plain HTML/JS)
- **TypeScript** config present (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) but source files are `.js`/`.html`/`.css`

## Dependencies
- `react` + `react-dom` ^19 — installed but not used in current implementation
- `@fortawesome/fontawesome-free` ^7 — icons loaded via CDN in `index.html` (not the npm package at runtime)

## Third-Party Integrations
- **Formspree** (`https://formspree.io/f/xkoveqyo`) — contact form submissions
- **Google Ads** (`gtag.js`, ID: `AW-17985693945`) — conversion tracking on phone links
- **Font Awesome 6** — loaded from cdnjs CDN
- **Google Maps** — embedded iframe in footer

## Common Commands
```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build (tsc -b && vite build)
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

## Deployment
- `railway.json` present — deployed on Railway
- `public/robots.txt` and `public/sitemap.xml` included for SEO
