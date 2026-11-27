export class Menu {

    #sections;

    constructor(sections = []) {
        this.#sections = sections;
    }

    page() {
        return "lib/html/menu-popup.html";
    }

    data() {
        const root = document.documentElement;
        const dark = root.dataset.theme === 'dark';
        const accent = root.style.getPropertyValue('--accent-bg').trim();

        return {
            sections: this.#sections.map((section) =>
                section.map((item) => item.label)),
            dark,
            accent,
        };
    }

    activate(value) {
        const [s, i] = value;
        this.#sections[s]?.[i]?.action?.();
    }
}
