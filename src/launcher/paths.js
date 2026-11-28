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
