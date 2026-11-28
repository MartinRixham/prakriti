export function isPopupPage(page) {
    return typeof page === 'string'
        && /^[\w-][\w./-]*$/.test(page)
        && !page.split('/').some((part) => part === '..' || part === '.');
}

export function resolvePage(base, page) {
    const path = base.replace(/[?#].*$/, '');
    return path.slice(0, path.lastIndexOf('/') + 1) + page;
}
