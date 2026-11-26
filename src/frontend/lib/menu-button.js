import { Binding } from './datum/Datum.js';

// A GtkMenuButton with a popover menu (GtkPopoverMenu). `sections` is an
// array of arrays of { label, action }: each inner array is one section,
// drawn with a separator between it and the next, as GMenu sections are.
//
// The menu opens in a native popup (menu-popup.html, see
// src/launcher/popup.js), free to hang past the window's edge as GTK's do.

const popupHandler = window.webkit?.messageHandlers?.appPopup;

const POPUP_ID = 'main-menu';

export class MenuButton {

    #loadIcon;

    #element;

    #sections;

    open = false;

    constructor(loadIcon, sections = []) {
        this.#loadIcon = loadIcon;
        this.#sections = sections;
    }

    onBind(element) {
        this.#element = element;

        window.addEventListener('apppopup', ({ detail }) => {
            if (detail.id !== POPUP_ID) {
                return;
            }

            if (detail.type === 'activate') {
                const [s, i] = detail.value ?? [];
                this.#sections[s]?.[i]?.action?.();
            }
            else if (detail.type === 'closed') {
                this.open = false;
            }
        });
    }

    close() {
        if (this.open) {
            popupHandler?.postMessage({ type: 'close', id: POPUP_ID });
        }
    }

    #toggle() {
        if (this.open) {
            this.close();
        }
        else {
            this.#openPopup();
        }
    }

    #openPopup() {
        if (!popupHandler) return;

        const button = this.#element.querySelector('[data-bind=button]');
        const { x, y, width, height } = button.getBoundingClientRect();

        const root = document.documentElement;
        const dark = root.dataset.theme === 'dark';
        const accent = root.style.getPropertyValue('--accent-bg').trim();

        popupHandler.postMessage({
            type: 'open',
            id: POPUP_ID,
            page: 'lib/html/menu-popup.html',
            anchor: { x, y, width, height },
            data: {
                sections: this.#sections.map((section) =>
                    section.map((item) => item.label)),
                dark,
                accent,
            },
        });

        this.open = true;
    }

    button = new Binding({
        async init(element) {
            element.innerHTML = await this.#loadIcon("actions/open-menu-symbolic.svg");
            element.title = "Main Menu";
            element.setAttribute("aria-label", "Main Menu");
            element.setAttribute("aria-haspopup", "menu");
        },
        update(element) {
            element.classList.toggle('checked', this.open);
            element.setAttribute("aria-expanded", String(this.open));
        },
        click() { this.#toggle(); }
    })
}
