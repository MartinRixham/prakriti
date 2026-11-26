import { assert, suite, test } from '../../harness.js';
import { Window } from '../../../src/frontend/lib/window.js'

suite('frontend/window');

test('Set header bar', async () => {

    const headerBar = {}

    const window = new Window(headerBar);

    assert.equal(window.headerBar, headerBar);
});

test('Pass button layout to header bar', async () => {

    const layoutString = "some,layout:string"

    let buttonLayout;

    const window = new Window({
        setButtonLayout(layout) {
            buttonLayout = layout;
        }
    });

    window.setButtonLayout(layoutString);

    assert.equal(buttonLayout, layoutString);
});

test('Set window theme light', async () => {

    const window = new Window({});

    window.setTheme(false);

    assert.equal(window.theme, "light");
});

test('Set window theme dark', async () => {

    const window = new Window({});

    window.setTheme(true);

    assert.equal(window.theme, "dark");
});
