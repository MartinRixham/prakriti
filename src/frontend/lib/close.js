import { Click } from './datum/Datum.js';

export class Close {

    #window;

    #loadIcon;

    constructor(window, loadIcon) {
        this.#window = window;
        this.#loadIcon = loadIcon;
    }

    async onBind(element) {
        element.innerHTML = await this.#loadIcon("ui/window-close-symbolic.svg");

        element.title = "Close";
        element.setAttribute("aria-label", "Close");
    }

    control = new Click(() => this.#window.close())
}
