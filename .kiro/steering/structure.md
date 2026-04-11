# Project Structure

## Overview
Flat single-page website. No component framework, no routing, no state management.

```
/
├── index.html          # Single HTML page — all sections, SEO meta, structured data, scripts
├── main.js             # All JS logic (ES module, imported by index.html)
├── style.css           # All styles — global, layout, components, responsive
├── vite.config.ts      # Vite build config
├── package.json
├── public/             # Static assets served at root (/)
│   ├── logo2.png       # Primary logo
│   ├── favicon.png
│   ├── banner2.jpeg    # Hero slideshow image
│   ├── front.png       # About section image
│   ├── refri.jpeg      # Refrigerators category
│   ├── wash.jpeg       # Washers & Dryers category
│   ├── estufa.jpeg     # Stoves & Ovens category
│   ├── tg.jpeg         # Slideshow image
│   ├── robots.txt
│   └── sitemap.xml
└── .kiro/
    └── steering/       # AI assistant guidance files
```

## Conventions

### HTML (`index.html`)
- All page sections live in one file: `#home`, `#shop`, `#about`, `#policies`, `#contact`
- Inline `<script>` only for gtag/analytics; all app logic goes in `main.js`
- Phone links always use `onclick="return gtag_report_conversion(...)"` for conversion tracking

### JavaScript (`main.js`)
- Organized as named `init*()` functions, all called from a single `DOMContentLoaded` listener
- No framework — direct DOM manipulation via `querySelector` / `addEventListener`
- Form submission uses `fetch` to Formspree endpoint

### CSS (`style.css`)
- CSS custom properties defined in `:root` — always use variables for colors and transitions
- Key variables: `--primary-color`, `--accent-color`, `--wine-red`, `--text-dark`, `--text-light`, `--transition`
- Mobile-first breakpoints: `@media (max-width: 768px)` and `@media (max-width: 480px)`
- Layout uses CSS Grid (`grid-template-columns`) for multi-column sections

### Assets
- All images referenced from `/` root (served from `public/`)
- External images only used in hero slideshow (Pexels URLs)
