import { isPopupPage, resolvePage } from './paths.js';

const num = (v) => (Number.isFinite(v) ? v : 0);

// The anchor, from the opener page's CSS px to the web view's.
export function scaleAnchor(anchor, zoom) {
    const a = anchor && typeof anchor === 'object' ? anchor : {};
    const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    return {
        x: Math.round(num(a.x) * z),
        y: Math.round(num(a.y) * z),
        width: Math.max(1, Math.round(num(a.width) * z)),
        height: Math.max(1, Math.round(num(a.height) * z)),
    };
}

// One popup, from opening to gone.
//
// host:
//   show(width, height)   open the popover with the page at this size
//   popdown()             close it; the popover then reports closed()
//   dispose()             let go of the popover and its web view
export class PopupSession {

    id;

    #host = null;

    #shown = false;

    #gone = false;

    #onActivate;

    #onGone;

    constructor(id, { onActivate, onGone }) {
        this.id = id;
        this.#onActivate = onActivate;
        this.#onGone = onGone;
    }

    get shown() { return this.#shown; }

    get gone() { return this.#gone; }

    start(host) {
        this.#host = host;
    }

    // A message from the popup's own page.
    pageMessage(msg) {
        if (this.#gone || !msg || typeof msg !== 'object') return;

        switch (msg.type) {
            case 'size':
                this.#show(msg);
                break;
            case 'activate':
                this.#onActivate(msg.value ?? null);
                this.close();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    close() {
        if (this.#gone) return;
        if (this.#shown) this.#host.popdown();
        else this.closed();
    }

    // Every way a popup goes ends here: closed by either page, or by GTK
    // (a click outside).
    closed() {
        if (this.#gone) return;
        this.#gone = true;
        this.#host?.dispose();
        this.#onGone();
    }

    #show({ width, height }) {
        if (this.#shown) return;
        this.#shown = true;
        this.#host.show(Math.max(1, Math.ceil(num(width))), Math.max(1, Math.ceil(num(height))));
    }
}

// The popups opened from one page, by id.
//
// opener:
//   uri()                     the page's URI
//   zoom()                    its zoom level
//   fireEvent(name, detail)   a CustomEvent on its window
// createHost({id, uri, anchor, data}, session) → the session's host
export class Popups {

    #opener;

    #createHost;

    #open = new Map();

    constructor({ opener, createHost }) {
        this.#opener = opener;
        this.#createHost = createHost;
    }

    get open() {
        return [...this.#open.values()];
    }

    // A message from the opener's page.
    handle(msg) {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'open') this.#openPopup(msg);
        else if (msg.type === 'close') this.#open.get(msg.id)?.close();
    }

    closeAll() {
        for (const session of this.open) session.close();
    }

    #openPopup({ id, page, anchor, data }) {
        const opener = this.#opener;
        const base = opener.uri();
        if (typeof id !== 'string' || !id || !base || !isPopupPage(page)) return;

        this.#open.get(id)?.close();

        const session = new PopupSession(id, {
            onActivate: (value) => opener.fireEvent('apppopup', { id, type: 'activate', value }),
            onGone: () => {
                if (this.#open.get(id) === session) this.#open.delete(id);
                opener.fireEvent('apppopup', { id, type: 'closed' });
            },
        });
        this.#open.set(id, session);

        session.start(this.#createHost({
            id,
            uri: resolvePage(base, page),
            anchor: scaleAnchor(anchor, opener.zoom()),
            data: data ?? null,
        }, session));
    }
}
