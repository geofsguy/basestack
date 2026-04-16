import createDOMPurify from 'dompurify';

const BLOCKED_TAGS = ['script', 'iframe', 'frame', 'object', 'embed', 'meta', 'base'];
const BLOCKED_ATTRS = ['srcdoc', 'action', 'formaction', 'srcset'];
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'sms:']);
const SAFE_MEDIA_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

function isSafeDataUrl(value: string) {
  return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value);
}

function sanitizeUrl(value: string, kind: 'link' | 'media') {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed;
  if (kind === 'media' && isSafeDataUrl(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const allowedProtocols = kind === 'media' ? SAFE_MEDIA_PROTOCOLS : SAFE_LINK_PROTOCOLS;
    if (!allowedProtocols.has(parsed.protocol)) {
      return null;
    }

    if (kind === 'link' && parsed.protocol === window.location.protocol && parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeGeneratedHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }

  const purifier = createDOMPurify(window);
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (!('getAttributeNames' in node)) return;

    for (const attr of node.getAttributeNames()) {
      const lowerName = attr.toLowerCase();
      if (lowerName.startsWith('on') || BLOCKED_ATTRS.includes(lowerName)) {
        node.removeAttribute(attr);
        continue;
      }

      if (['href'].includes(lowerName)) {
        const currentValue = node.getAttribute(attr);
        if (!currentValue) continue;
        const safeValue = sanitizeUrl(currentValue, 'link');
        if (!safeValue) {
          node.removeAttribute(attr);
        } else {
          node.setAttribute(attr, safeValue);
        }
        continue;
      }

      if (['src', 'poster', 'xlink:href'].includes(lowerName)) {
        const currentValue = node.getAttribute(attr);
        if (!currentValue) continue;
        const safeValue = sanitizeUrl(currentValue, 'media');
        if (!safeValue) {
          node.removeAttribute(attr);
        } else {
          node.setAttribute(attr, safeValue);
        }
        continue;
      }

      if (lowerName === 'style') {
        const styleValue = node.getAttribute(attr) || '';
        if (/(expression\s*\(|javascript:|behavior:|-moz-binding)/i.test(styleValue)) {
          node.removeAttribute(attr);
        }
      }
    }

    if (node.nodeName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const sanitized = purifier.sanitize(html, {
    ADD_TAGS: ['style'],
    FORBID_TAGS: BLOCKED_TAGS,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  purifier.removeAllHooks();
  return sanitized;
}
