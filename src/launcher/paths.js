const CONTENT_TYPES = {
    html: 'text/html',
    js: 'text/javascript',
    mjs: 'text/javascript',
    css: 'text/css',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    woff2: 'font/woff2',
};

// The type for a file name, by its extension; null where we don't know it.
export function contentTypeFor(name) {
    const dot = name.lastIndexOf('.');
    if (dot < 0 || dot < name.lastIndexOf('/')) return null;
    return CONTENT_TYPES[name.slice(dot + 1).toLowerCase()] ?? null;
}

// The path of an app:// request (as GLib.Uri gives it, still percent-
// encoded) as a path relative to the frontend directory: "" and "/" are
// index.html. null for anything that would leave the directory or can't be
// decoded.
export function appPath(requestPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(requestPath ?? '/');
    }
    catch {
        return null;
    }

    if (decoded.includes('\0') || decoded.includes('\\')) return null;

    const parts = [];
    for (const part of decoded.split('/')) {
        if (part === '' || part === '.') continue;
        if (part === '..') return null;
        parts.push(part);
    }

    return parts.length ? parts.join('/') : 'index.html';
}

// A popup page: a plain relative path below the opener's directory.
export function isPopupPage(page) {
    return typeof page === 'string'
        && /^[\w-][\w./-]*$/.test(page)
        && !page.split('/').some((part) => part === '..' || part === '.');
}

// `page` (already checked with isPopupPage) beside the page at `base`.
export function resolvePage(base, page) {
    const path = base.replace(/[?#].*$/, '');
    return path.slice(0, path.lastIndexOf('/') + 1) + page;
}
