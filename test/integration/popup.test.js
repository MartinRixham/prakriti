// createPopups (src/launcher/popup.js) with a real opener window, web views
// and popovers. The pages are in fixtures/.

import Gtk from 'gi://Gtk?version=4.0';
import WebKit from 'gi://WebKit?version=6.0';

import { createPopups } from '../../src/launcher/popup.js';
import { makeSettings } from '../../src/launcher/webview.js';
import { afterAll, assert, suite, test } from '../harness.js';
import { evaluate, fixture, loaded, popoversOf, waitFor } from './helpers.js';

suite('integration/popup');

const OPENER_URI = fixture('opener.html');

const ANCHOR = { x: 10, y: 20, width: 30, height: 40 };

let shared = null;

// One opener window for every test, its page loaded and its events cleared.
async function opener() {
    if (!shared) {
        const view = new WebKit.WebView({ settings: makeSettings() });
        const win = new Gtk.Window({ child: view, default_width: 400, default_height: 300 });
        const done = loaded(view);
        view.load_uri(OPENER_URI);
        win.present();
        await done;
        shared = { win, view, popups: createPopups(view) };
    }
    shared.popups.closeAll();
    await waitFor(() => popoversOf(shared.view).length === 0, 'the last test\'s popovers to go');
    await evaluate(shared.view, '__events.length = 0');
    return shared;
}

afterAll(async () => {
    if (!shared) return;
    shared.popups.closeAll();
    await waitFor(() => popoversOf(shared.view).length === 0, 'the popovers to go');
    shared.win.destroy();
});

function open(popups, id = 'p', data = { n: 1 }) {
    popups.handle({ type: 'open', id, page: 'popup.html', anchor: ANCHOR, data });
}

async function shownPopover(view) {
    return waitFor(() => popoversOf(view).find((popover) => popover.get_mapped()), 'a popover to show');
}

const events = (view) => evaluate(view, '__events');

test('a popup shows below its anchor, at the size its page asks for', async () => {
    const { view, popups } = await opener();
    open(popups);
    const popover = await shownPopover(view);
    const popupView = popover.get_child();
    assert.ok(popupView instanceof WebKit.WebView);
    assert.equal(popupView.get_uri(), fixture('popup.html'));
    assert.deepEqual(popupView.get_size_request(), [120, 80]);
    assert.equal(popover.get_position(), Gtk.PositionType.BOTTOM);
    const [, rect] = popover.get_pointing_to();
    assert.deepEqual({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }, ANCHOR);
    assert.ok(popover.has_css_class('web-popup'));
});

test('the popup page starts with its id and data', async () => {
    const { view, popups } = await opener();
    open(popups, 'menu', { sections: [['A', 'B']], dark: true });
    const popover = await shownPopover(view);
    assert.deepEqual(await evaluate(popover.get_child(), '__seen'),
        { id: 'menu', data: { sections: [['A', 'B']], dark: true } });
});

test('choosing in the popup tells the opener, then closes it', async () => {
    const { view, popups } = await opener();
    open(popups);
    const popover = await shownPopover(view);
    await evaluate(popover.get_child(),
        'window.webkit.messageHandlers.appPopup.postMessage({ type: "activate", value: [0, 1] })');
    await waitFor(() => popoversOf(view).length === 0, 'the popover to go');
    await waitFor(async () => (await events(view)).length === 2, 'two events');
    assert.deepEqual(await events(view), [
        { id: 'p', type: 'activate', value: [0, 1] },
        { id: 'p', type: 'closed' },
    ]);
});

test('the popup page can close it', async () => {
    const { view, popups } = await opener();
    open(popups);
    const popover = await shownPopover(view);
    await evaluate(popover.get_child(), 'window.webkit.messageHandlers.appPopup.postMessage({ type: "close" })');
    await waitFor(() => popoversOf(view).length === 0, 'the popover to go');
    assert.deepEqual(await events(view), [{ id: 'p', type: 'closed' }]);
});

test('popping it down from the GTK side closes it', async () => {
    const { view, popups } = await opener();
    open(popups);
    const popover = await shownPopover(view);
    popover.popdown();
    await waitFor(() => popoversOf(view).length === 0, 'the popover to go');
    assert.deepEqual(await events(view), [{ id: 'p', type: 'closed' }]);
    assert.deepEqual(popups.open, []);
});

test('closeAll closes every popup', async () => {
    const { view, popups } = await opener();
    open(popups, 'a');
    open(popups, 'b');
    await waitFor(() => popoversOf(view).filter((popover) => popover.get_mapped()).length >= 1, 'popovers to show');
    popups.closeAll();
    await waitFor(() => popoversOf(view).length === 0, 'the popovers to go');
    const closed = (await events(view)).map((event) => `${event.id} ${event.type}`).sort();
    assert.deepEqual(closed, ['a closed', 'b closed']);
});

test('opening the same id again replaces the popup', async () => {
    const { view, popups } = await opener();
    open(popups, 'p', { n: 1 });
    const first = await shownPopover(view);
    open(popups, 'p', { n: 2 });
    const second = await waitFor(() => popoversOf(view).find((popover) => popover !== first && popover.get_mapped()),
        'the second popover to show');
    await waitFor(() => !popoversOf(view).includes(first), 'the first popover to go');
    assert.deepEqual(await evaluate(second.get_child(), '__seen.data'), { n: 2 });
    assert.deepEqual(await events(view), [{ id: 'p', type: 'closed' }]);
    assert.equal(popups.open.length, 1);
});
