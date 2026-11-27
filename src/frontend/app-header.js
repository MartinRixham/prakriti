import { HeaderBar } from './lib/header-bar.js';
import { MenuButton } from './lib/menu-button.js';
import { Button } from './lib/button.js';

import { MainMenu } from './main-menu.js';

export function AppHeader() {

    return new HeaderBar(
        "App",
        [new Button("New", "actions/list-add-symbolic.svg", () => { })],
        [new MenuButton(new MainMenu())]
    );
}
