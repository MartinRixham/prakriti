// Fakes shared by the launcher's tests. (A fake page is test/page.js.)

// Something with GObject's connect(), and a way to emit what was connected.
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
