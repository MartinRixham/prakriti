// AppWindow (src/launcher/window.js) with a real Adw.Application, window and
// web view, the real injected bridge, and a fake desktop. The pages are in
// fixtures/.

import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';

import { AppWindow } from '../../src/launcher/window.js';
import { afterAll, assert, suite, test } from '../harness.js';
import { evaluate, fixture, loaded, popoversOf, settle, waitFor } from './helpers.js';

suite('integration/window');

const BRIDGE = (() => {
    const file = Gio.File.new_for_uri(import.meta.url).get_parent()
        .resolve_relative_path('../../src/launcher/inject/bridge.js');
    const [, bytes] = file.load_contents(null);
    return new TextDecoder().decode(bytes);
})();

const app = new Adw.Application({
    application_id: 'org.example.PrakritiTest',
    flags: Gio.ApplicationFlags.NON_UNIQUE,
});

let registered = false;

function fakeDesktop() {
    const desktop = {
        dark: false,
        accent: '#3584e4',
        buttonLayout: 'appmenu:close',
        listeners: [],
        onChange(fn) { desktop.listeners.push(fn); },
        change(values) {
            Object.assign(desktop, values);
            for (const fn of desktop.listeners) fn(desktop);
        },
    };
    return desktop;
}

let last = null;

// Destroys the last test's window, and ends its web process: left to the
// garbage collector, each would hold on to its memory until the end.
function closeLast() {
    if (!last) return;
    last.view.terminate_web_process();
    last.win.destroy();
    last = null;
}

// A window on fixtures/window.html, its page loaded.
async function openWindow(title, api = {}) {
    if (!registered) {
        app.register(null);
        registered = true;
    }
    closeLast();
    const desktop = fakeDesktop();
    const appWindow = new AppWindow(app, title, 400, 300, fixture('window.html'), api, desktop, BRIDGE);
    last = appWindow;
    await loaded(appWindow.view);
    await waitFor(() => appWindow.win.get_mapped(), 'the window to map');
    return { win: appWindow.win, view: appWindow.view, desktop };
}

afterAll(closeLast);

test('the page calls the app\'s api through the bridge', async () => {
    const { view } = await openWindow(undefined, { add: (a, b) => a + b, later: async () => 'done' });
    assert.equal(await settle(view, 'app.api.call("add", 2, 3)'), 5);
    assert.equal(await settle(view, 'app.api.call("later")'), 'done');
});

test('an api call that fails rejects in the page with its message', async () => {
    const { view } = await openWindow(undefined, { broken: () => { throw new Error('no good'); } });
    assert.equal(await settle(view, 'app.api.call("broken").catch((error) => error.message)'), 'no good');
    assert.equal(await settle(view, 'app.api.call("missing").catch((error) => error.message)'),
        'No such api: missing');
});

test('win.getState gives the window\'s state', async () => {
    const { view } = await openWindow();
    const state = await settle(view, 'app.win.getState()');
    assert.deepEqual({ ...state, focused: undefined },
        { win: 'main', fullscreen: false, maximized: false, minimized: false, focused: undefined });
});

test('win.zoom maximizes and restores the window, and the page hears of each', async () => {
    const { win, view } = await openWindow();
    await settle(view, 'app.win.zoom()');
    await waitFor(() => win.maximized, 'the window to maximize');
    await waitFor(async () => (await evaluate(view, '__states')).some((state) => state.maximized),
        'the page to hear it is maximized');

    await settle(view, 'app.win.zoom()');
    await waitFor(() => !win.maximized, 'the window to restore');
    await waitFor(async () => !(await evaluate(view, '__states')).at(-1).maximized,
        'the page to hear it is restored');
});

test('theme.get gives the desktop\'s dark setting, and the page hears of changes', async () => {
    const { view, desktop } = await openWindow();
    assert.deepEqual(await settle(view, 'app.theme.get()'), { dark: false });
    desktop.change({ dark: true });
    await waitFor(async () => (await evaluate(view, '__themes')).length === 1, 'the page to hear the theme');
    assert.deepEqual(await evaluate(view, '__themes'), [true]);
    assert.deepEqual(await settle(view, 'app.theme.get()'), { dark: true });
});

test('the page gets the desktop style once it asks, and again when it changes', async () => {
    const { view, desktop } = await openWindow();
    assert.equal(await evaluate(view, 'window.__appDesktopStyle'), undefined);
    await evaluate(view, 'window.webkit.messageHandlers.appDesktopStyle.postMessage(null)');
    await waitFor(() => evaluate(view, 'window.__appDesktopStyle'), 'the desktop style');
    assert.deepEqual(await evaluate(view, '__appDesktopStyle'), { buttonLayout: 'appmenu:close', accent: '#3584e4' });

    desktop.change({ accent: '', buttonLayout: 'close:' });
    await waitFor(async () => (await evaluate(view, '__appDesktopStyle')).buttonLayout === 'close:',
        'the new desktop style');
    assert.deepEqual(await evaluate(view, '__appDesktopStyle'), { buttonLayout: 'close:', accent: null });
});

test('the page opens a popup on its view', async () => {
    const { view } = await openWindow();
    await evaluate(view, `window.webkit.messageHandlers.appPopup.postMessage({
        type: 'open', id: 'menu', page: 'popup.html', anchor: { x: 1, y: 2, width: 3, height: 4 }, data: null,
    })`);
    const popover = await waitFor(() => popoversOf(view).find((p) => p.get_mapped()), 'the popup to show');
    popover.popdown();
    await waitFor(async () => (await evaluate(view, '__popupEvents')).length === 1, 'the page to hear it closed');
    assert.deepEqual(await evaluate(view, '__popupEvents'), [{ id: 'menu', type: 'closed' }]);
});

// Closed: hidden and let go of by the application. (GTK emits destroy only on
// dispose, which the test's own references put off.)
const closed = (win) => !win.get_visible() && !app.get_windows().includes(win);

test('win.close closes the window', async () => {
    const { win, view } = await openWindow();
    await settle(view, 'app.win.close()');
    await waitFor(() => closed(win), 'the window to close');
});

test('win.close closes the window\'s popups first', async () => {
    const { win, view } = await openWindow();
    await evaluate(view, `window.webkit.messageHandlers.appPopup.postMessage({
        type: 'open', id: 'menu', page: 'popup.html', anchor: { x: 1, y: 2, width: 3, height: 4 }, data: null,
    })`);
    await waitFor(() => popoversOf(view).some((p) => p.get_mapped()), 'the popup to show');
    await settle(view, 'app.win.close()');
    await waitFor(() => closed(win), 'the window to close');
    await waitFor(() => popoversOf(view).length === 0, 'the popup to go');
});

test('a window with a title keeps it', async () => {
    const { win } = await openWindow('Given');
    assert.equal(win.title, 'Given');
});

test('a window without a title takes the page\'s', async () => {
    const { win, view } = await openWindow(undefined);
    await waitFor(() => win.title === 'Window page', 'the page\'s title');
    await evaluate(view, 'document.title = "Changed"');
    await waitFor(() => win.title === 'Changed', 'the changed title');
});
