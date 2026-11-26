import { Click } from './datum/Datum.js';

export class Minimize {

    #window;

    #loadIcon;

    constructor(window, loadIcon) {
        this.#window = window;
        this.#loadIcon = loadIcon;
    }

    async onBind(element) {
        element.innerHTML = await this.#loadIcon("ui/window-minimize-symbolic.svg");

        element.title = "Minimize";
        element.setAttribute("aria-label", "Minimize");
    }

    control = new Click(() => this.#window.minimize())
}
