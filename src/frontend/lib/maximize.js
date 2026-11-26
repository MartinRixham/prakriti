import { Binding } from './datum/Datum.js';

export class Maximize {

    #window;

    #loadIcon;

    #isMaximized;

    constructor(window, loadIcon, isMaximized) {
        this.#window = window;
        this.#loadIcon = loadIcon
        this.#isMaximized = isMaximized;
    }

    control = new Binding({
        async update(element) {
            if (this.#isMaximized()) {
                element.innerHTML = await this.#loadIcon("ui/window-restore-symbolic.svg");
                element.title = "Restore";
                element.setAttribute("aria-label", "Restore");
            }
            else {
                element.innerHTML = await this.#loadIcon("ui/window-maximize-symbolic.svg");
                element.title = "Maximize";
                element.setAttribute("aria-label", "Maximize");
            }
        },
        click() { this.#window.zoom(); }
    })
}
