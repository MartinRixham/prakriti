(() => {
    const handler = window.webkit.messageHandlers.app;

    const call = (method, args = null) => handler.postMessage({ method, args });

    const listeners = new Map();

    const on = (name, callback) => {
        if (!listeners.has(name)) {
            listeners.set(name, new Set());
        }

        listeners.get(name).add(callback);
        return () => listeners.get(name).delete(callback);
    };

    Object.defineProperty(window, '__appEmit', {
        value(name, detail) {
            for (const callback of listeners.get(name) ?? []) {
                try {
                    callback(detail);
                }
                catch (event) {
                    console.error(event);
                }
            }
        },
    });

    window.app = {
        api: {
            call: (name, args = null) => call('api.call', { name, args }),
            on,
        },
        win: {
            id: 'main',
            close: () => call('win.close'),
            minimize: () => call('win.minimize'),
            zoom: () => call('win.zoom'),
            getState: () => call('win.getState'),
            onState: (callback) => on('window-state', callback),
            startDrag: () => call('win.startDrag'),
        },
        theme: {
            get: () => call('theme.get'),                       // { dark }
            on: (callback) => on('theme', ({ dark }) => callback(dark)),
        },
    };

    const DRAG_THRESHOLD = 8;

    let pressedAt = null;

    window.addEventListener('mousedown', (event) => {
        pressedAt = null;
        if (event.button !== 0 ||
            !event.target.closest('[data-app-drag]') ||
            event.target.closest('button, a, input, textarea, select, [contenteditable], [data-app-nodrag]')) {
            return;
        }

        if (event.detail === 2) {
            call('win.zoom');
        }
        else {
            pressedAt = { x: event.screenX, y: event.screenY };
        }
    });

    window.addEventListener('mousemove', (event) => {
        if (!pressedAt) {
            return;
        }

        if (!(event.buttons & 1)) {
            pressedAt = null;
            return;
        }

        if (Math.hypot(event.screenX - pressedAt.x, event.screenY - pressedAt.y) < DRAG_THRESHOLD) {
            return;
        }

        pressedAt = null;
        call('win.startDrag');
    });

    window.addEventListener('mouseup', () => {
        pressedAt = null;
    });
})();
