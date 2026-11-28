export class PopupSession {

    id;

    #host = null;

    #shown = false;

    #gone = false;

    #onActivate;

    #onGone;

    constructor(id, onActivate, onGone) {
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
        if (this.#gone || !msg || typeof msg !== 'object') {
            return;
        }

        switch (msg.type) {
            case 'size':
                this.#show(msg.width, msg.height);
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
        if (this.#gone) {
            return;
        }
        else if (this.#shown) {
            this.#host.popdown();
        }
        else {
            this.closed();
        }
    }

    closed() {
        if (!this.#gone) {
            this.#gone = true;
            this.#host?.dispose();
            this.#onGone();
        }
    }

    #show(width, height) {
        if (!this.#shown) {
            this.#shown = true;
            this.#host.show(width, height);
        }
    }
}
