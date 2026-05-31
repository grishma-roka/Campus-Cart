/**
 * Resolves any image path stored in the DB to a full URL.
 * Handles all formats:
 *   /uploads/image-xxx.jpg
 *   /uploads/items/xxx.jpg
 *   /uploads/licenses/xxx.jpg
 *   uploads/xxx.jpg  (no leading slash)
 *   xxx.jpg          (raw filename)
 *   http://...       (already absolute)
 *   ["path"]         (JSON array string)
 */
const BACKEND = 'http://localhost:5000';

export function imgUrl(raw, fallback = '') {
  if (!raw) return fallback;
  try {
    // Unwrap JSON array
    let src = raw;
    if (typeof src === 'string' && src.startsWith('[')) {
      const parsed = JSON.parse(src);
      src = Array.isArray(parsed) ? parsed[0] : parsed;
    }
    if (Array.isArray(src)) src = src[0];
    if (!src) return fallback;
    src = String(src).replace(/^["'\s]+|["'\s]+$/g, ''); // strip stray quotes
    if (!src) return fallback;
    if (src.startsWith('http')) return src;
    if (src.startsWith('/uploads/')) return `${BACKEND}${src}`;
    if (src.startsWith('uploads/')) return `${BACKEND}/${src}`;
    // Raw filename — default to /uploads/
    return `${BACKEND}/uploads/${src}`;
  } catch {
    return fallback;
  }
}

/** Picks first image from a JSON array or plain string */
export function firstImg(images, fallback = '') {
  return imgUrl(images, fallback);
}
