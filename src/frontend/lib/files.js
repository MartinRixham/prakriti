export function loadIcon(name) {
    return app.api.call('icon', name);
}

export function loadTemplate(file) {
    return fetch(file)
        .then((response) => response.text())
        .catch(() => '');
}
