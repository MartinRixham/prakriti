import { isPopupPage, resolvePage } from './paths.js';
import { PopupSession } from './popup-session.js';

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
            anchor: anchor,
            data: data ?? null,
        }, session));
    }
}
