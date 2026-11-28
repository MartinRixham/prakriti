import { isPopupPage, resolvePage } from './paths.js';
import { PopupSession } from './popup-session.js';

export class Popups {

    #opener;

    #createHost;

    #open = new Map();

    constructor(opener, createHost) {
        this.#opener = opener;
        this.#createHost = createHost;
    }

    get open() {
        return [...this.#open.values()];
    }

    handle(message) {
        if (!message || typeof message !== 'object') {
            return;
        }
        else if (message.type === 'open') {
            this.#openPopup(message.id, message.page, message.anchor, message.data);
        }
        else if (message.type === 'close') {
            this.#open.get(message.id)?.close();
        }
    }

    closeAll() {
        for (const session of this.open) {
            session.close();
        }
    }

    #openPopup(id, page, anchor, data) {
        const opener = this.#opener;
        const base = opener.uri();
        if (typeof id !== 'string' || !id || !base || !isPopupPage(page)) return;

        this.#open.get(id)?.close();

        const session = new PopupSession(id,
            (value) => opener.fireEvent('apppopup', { id, type: 'activate', value }),
            () => {
                if (this.#open.get(id) === session) this.#open.delete(id);
                opener.fireEvent('apppopup', { id, type: 'closed' });
            });
        this.#open.set(id, session);

        session.start(this.#createHost(id, resolvePage(base, page), anchor, data ?? null, session));
    }
}
