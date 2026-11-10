/**
 * imageUtils.js — responsive, cached product images.
 *
 * Product images are served by the backend at
 *   <API>/api/v1/images/products/<file>?w=<width>
 * which returns a resized WebP cached for a year. These helpers build the
 * `src`/`srcset` for that endpoint and handle the skeleton → fade-in
 * transition plus a graceful fallback when an image fails.
 */

const IMAGE_ROUTE = '/api/v1/images/';

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%237f8c8d' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

/** Responsive presets: candidate widths + the `sizes` hint for each slot. */
export const IMAGE_PRESETS = {
  card:   { widths: [320, 640],              sizes: '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 320px' },
  detail: { widths: [640, 960, 1280, 1600],  sizes: '(max-width: 768px) 100vw, 50vw' },
  thumb:  { widths: [160],                   sizes: '80px' },
};

/** Escapes a value for safe use inside an HTML attribute. */
export function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** True when the URL points at the backend images endpoint (resizable). */
export function isResizable(url) {
  return typeof url === 'string' && url.includes(IMAGE_ROUTE);
}

/** Returns the URL with `?w=<width>` set, or the URL unchanged if not resizable. */
export function sizedUrl(url, width) {
  if (!isResizable(url)) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('w', String(width));
    return u.toString();
  } catch {
    return url;
  }
}

/** Removes any `w` parameter (used as a fallback to the original file). */
export function originalUrl(url) {
  if (!isResizable(url)) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.delete('w');
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Builds `src`, `srcset` and `sizes` for an image URL and preset.
 * @returns {{ src: string, srcset: string, sizes: string }}
 */
export function responsiveSources(url, presetName) {
  const src = url && String(url).trim() ? url : PLACEHOLDER_IMAGE;
  const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.card;

  if (!isResizable(src)) return { src, srcset: '', sizes: '' };

  const srcset = preset.widths.map(w => `${sizedUrl(src, w)} ${w}w`).join(', ');
  return { src: sizedUrl(src, preset.widths[0]), srcset, sizes: preset.sizes };
}

/**
 * Returns an `<img>` tag string with responsive sources and skeleton hooks.
 * Call `hydrateImages(container)` after inserting it into the DOM.
 *
 * @param {string} url
 * @param {object} opts
 * @param {string} opts.alt
 * @param {'card'|'detail'|'thumb'} [opts.preset]
 * @param {boolean} [opts.eager] Load immediately with high priority (LCP image).
 * @param {number} [opts.width]  Intrinsic width hint (prevents layout shift).
 * @param {number} [opts.height] Intrinsic height hint.
 * @param {string} [opts.className]
 * @param {string} [opts.id]
 * @param {Record<string,string>} [opts.data] Extra data-* attributes.
 */
export function imgTag(url, opts = {}) {
  const { alt = '', preset = 'card', eager = false, width, height, className = '', id, data = {} } = opts;
  const { src, srcset, sizes } = responsiveSources(url, preset);

  const attrs = [
    id ? `id="${escapeAttr(id)}"` : '',
    `class="lazy-img ${escapeAttr(className)}"`.trim(),
    `src="${escapeAttr(src)}"`,
    srcset ? `srcset="${escapeAttr(srcset)}"` : '',
    sizes ? `sizes="${escapeAttr(sizes)}"` : '',
    `alt="${escapeAttr(alt)}"`,
    width ? `width="${width}"` : '',
    height ? `height="${height}"` : '',
    `loading="${eager ? 'eager' : 'lazy'}"`,
    `decoding="async"`,
    eager ? `fetchpriority="high"` : '',
    ...Object.entries(data).map(([k, v]) => `data-${k}="${escapeAttr(v)}"`),
  ];
  return `<img ${attrs.filter(Boolean).join(' ')} />`;
}

function markLoaded(img) {
  img.classList.add('is-loaded');
  img.closest('.img-frame')?.classList.add('is-loaded');
}

/**
 * Error fallback chain: resized variant → original file → placeholder.
 * Keeps images visible even if the resize endpoint is unavailable.
 */
function handleError(img) {
  const stage = img.dataset.fallback || '';
  const current = img.currentSrc || img.src;

  if (!stage && isResizable(current)) {
    img.dataset.fallback = 'original';
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = originalUrl(current);
    return;
  }
  if (stage !== 'placeholder') {
    img.dataset.fallback = 'placeholder';
    img.removeAttribute('srcset');
    img.src = PLACEHOLDER_IMAGE;
    return;
  }
  markLoaded(img);
}

/**
 * Wires skeleton removal + error fallback for every `.lazy-img` inside root.
 * Safe to call multiple times.
 */
export function hydrateImages(root) {
  if (!root) return;
  root.querySelectorAll('img.lazy-img').forEach(img => {
    if (img.dataset.hydrated) return;
    img.dataset.hydrated = '1';
    img.addEventListener('load', () => markLoaded(img));
    img.addEventListener('error', () => handleError(img));
    // Already decoded from cache before listeners were attached.
    if (img.complete && img.naturalWidth > 0) markLoaded(img);
    else if (img.complete && img.currentSrc) handleError(img);
  });
}

/**
 * Starts downloading an image in the background so it is cached when shown.
 * Uses the same srcset/sizes as the real element, so the browser picks the
 * same candidate and the later render is instant.
 */
const prefetched = new Set();
export function prefetchImage(url, presetName = 'detail') {
  if (!url || prefetched.has(url + presetName)) return;
  prefetched.add(url + presetName);
  const { src, srcset, sizes } = responsiveSources(url, presetName);
  const img = new Image();
  img.decoding = 'async';
  if (sizes) img.sizes = sizes;
  if (srcset) img.srcset = srcset;
  img.src = src;
}
