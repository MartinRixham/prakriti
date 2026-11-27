export function loadIcon(name) {
    return app.api.call('icon', { file: name });
}

export function loadTemplate(file) {
    return fetch(file)
        .then((response) => (response.ok ? response.text() : ''))
        .catch(() => '');
}
