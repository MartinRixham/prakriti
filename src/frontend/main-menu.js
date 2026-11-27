import { Menu } from './lib/menu.js';

export function MainMenu() {

    return new Menu([
        [
            { label: "Preferences" },
            { label: "Keyboard Shortcuts" },
            { label: "About App" },
        ],
        [
            { label: "Quit", action: () => { app.win.close(); } },
        ],
    ]);
}
