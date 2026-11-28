export function loadIcon(name) {
    return app.api.call('icon', { file: name });
}

export function loadTemplate(file) {
    return fetch(file)
        // Over file:// a found file has status 0, so response.ok is no
        // guide; a missing one rejects.
        .then((response) => response.text())
        .catch(() => '');
}
