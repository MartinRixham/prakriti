(() => {
    const handler = window.webkit.messageHandlers.app;

    const call = (method, args = null) => handler.postMessage({ method, args });

    const listeners = new Map();

    const on = (name, fn) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(fn);
        return () => listeners.get(name).delete(fn);
    };

    Object.defineProperty(window, '__appEmit', {
        value(name, detail) {
            for (const fn of listeners.get(name) ?? []) {
                try { fn(detail); } catch (e) { console.error(e); }
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
            onState: (fn) => on('window-state', fn),
            startDrag: () => call('win.startDrag'),
        },
        theme: {
            get: () => call('theme.get'),                       // { dark }
            on: (fn) => on('theme', ({ dark }) => fn(dark)),
        },
    };

    // Drag regions for the frameless window: any element with
    // data-app-drag acts as a title bar. Dragging moves the window, a
    // double click maximizes or restores it. Interactive children, or
    // anything inside data-app-nodrag, are left alone.
    //
    // The move starts only once the pointer has gone DRAG_THRESHOLD px with
    // the button held, as in a GTK header bar: a move hands the pointer to
    // the compositor, so starting one on the press would keep the second
    // click of a double click from ever reaching the page.
    const DRAG_THRESHOLD = 8;
    let pressedAt = null;

    window.addEventListener('mousedown', (e) => {
        pressedAt = null;
        if (e.button !== 0) return;
        if (!e.target.closest('[data-app-drag]')) return;
        if (e.target.closest('button, a, input, textarea, select, [contenteditable], [data-app-nodrag]')) return;
        if (e.detail === 2) call('win.zoom');
        else pressedAt = { x: e.screenX, y: e.screenY };
    });

    window.addEventListener('mousemove', (e) => {
        if (!pressedAt) return;
        if (!(e.buttons & 1)) {
            pressedAt = null;
            return;
        }
        if (Math.hypot(e.screenX - pressedAt.x, e.screenY - pressedAt.y) < DRAG_THRESHOLD) return;
        pressedAt = null;
        call('win.startDrag');
    });

    window.addEventListener('mouseup', () => { pressedAt = null; });
})();
