export function fakeGObject(props = {}) {
    const handlers = [];
    return Object.assign(props, {
        connect(signal, fn) {
            handlers.push({ signal, fn });
            return handlers.length;
        },
        emit(signal, ...args) {
            for (const h of handlers.filter((h) => h.signal === signal)) h.fn(this, ...args);
        },
        connected: () => handlers.map((h) => h.signal),
    });
}

export function fakePopover(session) {
    const host = {
        session,
        shown: null,
        popdowns: 0,
        disposed: 0,
        show(width, height) { host.shown = { width, height }; },
        popdown() {
            host.popdowns++;
            session.closed();
        },
        dispose() { host.disposed++; },
    };
    return host;
}
