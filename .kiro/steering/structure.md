# Project Structure

## Overview
Multi-entry Vite project with two frontend domains: a public-facing site (`src/frontend/`) and an admin panel (`src/admin/`). Backend is a separate Node.js/Express process. No component framework — plain HTML/JS/CSS throughout.

```
/
├── src/
│   ├── frontend/               # Public site (single page)
│   │   ├── index.html          # Entry point — all sections, SEO meta, structured data
│   │   ├── main.js             # All frontend JS logic (ES module)
│   │   └── style.css           # All frontend styles
│   └── admin/                  # Admin panel
│       ├── index.html          # Admin login page
│       ├── categories.html     # Admin categories page
│       ├── products.html       # Admin products page
│       ├── users.html          # Admin users page
│       ├── admin.css           # Admin panel styles
│       ├── auth.js             # Session management, logout
│       ├── auth-login.js       # Login form logic
│       ├── layout.js           # Shared layout/nav init, session guard
│       ├── router.js           # Client-side routing
│       ├── state.js            # Shared state management
│       ├── api.js              # API client (fetch wrappers)
│       ├── modal.js            # Modal component
│       ├── notifications.js    # Toast/notification system
│       ├── imageService.js     # Image upload helpers
│       ├── validators.js       # Form validation
│       ├── modules/            # Domain logic modules
│       │   ├── categories.js
│       │   ├── products.js
│       │   └── users.js
│       └── pages/              # Page-level controllers
│           ├── categories-page.js
│           ├── products-page.js
│           └── users-page.js
├── public/                     # Static assets served at / by Vite (unchanged)
│   ├── logo2.png               # Primary logo
│   ├── favicon.png
│   ├── banner2.jpeg            # Hero slideshow image
│   ├── front.png               # About section image
│   ├── refri.jpeg              # Refrigerators category
│   ├── wash.jpeg               # Washers & Dryers category
│   ├── estufa.jpeg             # Stoves & Ovens category
│   ├── tg.jpeg                 # Slideshow image
│   ├── robots.txt
│   └── sitemap.xml
├── backend/                    # Node.js/Express API server (separate process, unchanged)
│   ├── server.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── swagger.js
├── vite.config.ts              # Vite build config (multi-entry)
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── railway.json
└── vite-env.d.ts
```

## Domain Separation

- `src/frontend/` — everything for the public-facing site. One HTML page, one JS module, one CSS file.
- `src/admin/` — all admin panel files: HTML entry points, shared utilities, domain modules, and page controllers.
- `public/` — static assets only. Not moved. Referenced via absolute paths (`/logo2.png`, etc.).
- `backend/` — Express API server. Runs as a separate process. Not bundled by Vite.
- Root — config files only (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `package.json`, `railway.json`, `vite-env.d.ts`). Tools require these at the root by convention.

## Conventions

### HTML
- `src/frontend/index.html` — all public sections in one file: `#home`, `#shop`, `#about`, `#policies`, `#contact`
- Admin HTML files each map to one panel page; they share `admin.css` and reference JS via relative `./` paths
- Inline `<script>` only for gtag/analytics; all app logic goes in separate `.js` modules
- Phone links always use `onclick="return gtag_report_conversion(...)"` for conversion tracking
- Asset paths are always absolute from `/` (e.g. `/logo2.png`) — never relative

### JavaScript
- `src/frontend/main.js` — organized as named `init*()` functions, all called from a single `DOMContentLoaded` listener
- Admin JS is split by responsibility: `auth.js` (session/logout), `layout.js` (nav + session guard), `api.js` (fetch wrappers), `state.js` (shared state), `router.js` (client-side routing)
- Page-specific logic lives in `pages/`; domain data logic lives in `modules/`
- No framework — direct DOM manipulation via `querySelector` / `addEventListener`
- Contact form submission uses `fetch` to Formspree endpoint

### CSS
- CSS custom properties defined in `:root` — always use variables for colors and transitions
- Key variables: `--primary-color`, `--accent-color`, `--wine-red`, `--text-dark`, `--text-light`, `--transition`
- Mobile-first breakpoints: `@media (max-width: 768px)` and `@media (max-width: 480px)`
- Layout uses CSS Grid (`grid-template-columns`) for multi-column sections
- `src/frontend/style.css` — public site styles only
- `src/admin/admin.css` — admin panel styles only

### Assets
- All images live in `public/` and are referenced with absolute paths from `/` (e.g. `/logo2.png`)
- External images only used in the hero slideshow (Pexels URLs)
- `public/` content is copied as-is to the build output by Vite
