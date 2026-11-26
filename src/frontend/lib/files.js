export function loadIcon(name) {
    return app.api.call('icon', { file: name });
}

// The file's text; '' if it is missing or can't be loaded.
export function loadTemplate(file) {
    return fetch(file)
        .then((response) => (response.ok ? response.text() : ''))
        .catch(() => '');
}
