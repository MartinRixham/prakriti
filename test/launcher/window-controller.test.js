import { assert, suite, test } from '../harness.js';
import { Page } from '../page.js';
import { FOCUS_LOSS_GRACE_MILLISECONDS, WIN_ID, WindowController } from '../../src/launcher/window-controller.js';

suite('launcher/window-controller');

// A window: records what was asked of it, runs scripts in a page whose
// bridge records what it is told, and holds back `later` until flush().
function fakeHost(initial = {}) {
    const page = new Page('globalThis.__emitted = []; window.__appEmit = (name, detail) => __emitted.push({ name, detail });');

    const host = {
        calls: [],
        timers: [],
        maximized: false,
        active: true,
        toplevel: { fullscreen: false, maximized: false, minimized: false },
        page,
        get emitted() { return page.get('__emitted'); },
        close() { host.calls.push('close'); },
        minimize() { host.calls.push('minimize'); },
        maximize() { host.calls.push('maximize'); },
        unmaximize() { host.calls.push('unmaximize'); },
        closePopups() { host.calls.push('closePopups'); },
        toplevelState() { return host.toplevel; },
        beginMove(device, x, y, time) { host.calls.push(['beginMove', device, x, y, time]); },
        runScript(script) { page.run(script); },
        later(milliseconds, fn) { host.timers.push({ milliseconds, fn }); },
        flush() {
            const due = host.timers.splice(0);
            for (const t of due) t.fn();
        },
    };
    return Object.assign(host, initial);
}

function fakeDesktop(dark = false, accent = '#3584e4', buttonLayout = 'appmenu:close') {
    const desktop = {
        dark, accent, buttonLayout,
        listeners: [],
        onChange(fn) { desktop.listeners.push(fn); },
        change(values) {
            Object.assign(desktop, values);
            for (const fn of desktop.listeners) fn(desktop);
        },
    };
    return desktop;
}

function setup(host = fakeHost(), desktop = fakeDesktop(), api) {
    const controller = new WindowController(host, desktop, api);
    return { controller, host, desktop };
}

// ---- app.api.call ---------------------------------------------------------

test('api.call calls the app\'s api with the args', async () => {
    let seen;
    const { controller } = setup(undefined, undefined, { icon: (...args) => { seen = args; return '<svg/>'; } });
    const result = await controller.call('api.call', { name: 'icon', args: ['a.svg', 16] });
    assert.deepEqual(seen, ['a.svg', 16]);
    assert.equal(result, '<svg/>');
});

test('api.call passes nothing when the page gives no args', () => {
    let seen;
    const { controller } = setup(undefined, undefined, { f: (...args) => { seen = args; } });
    controller.call('api.call', { name: 'f' });
    assert.deepEqual(seen, []);
    controller.call('api.call', { name: 'f', args: null });
    assert.deepEqual(seen, []);
    controller.call('api.call', { name: 'f', args: { file: 'a.svg' } });
    assert.deepEqual(seen, []);
});

test('api.call hands back a promise as it is', async () => {
    const { controller } = setup(undefined, undefined, { slow: async () => 'done' });
    const result = controller.call('api.call', { name: 'slow' });
    assert.ok(result instanceof Promise);
    assert.equal(await result, 'done');
});

test('api.call keeps the api as `this`', () => {
    const api = { prefix: 'x-', name(v) { return this.prefix + v; } };
    const { controller } = setup(undefined, undefined, api);
    assert.equal(controller.call('api.call', { name: 'name', args: [1] }), 'x-1');
});

test('api.call refuses names the api does not have', () => {
    const { controller } = setup(undefined, undefined, { icon() {} });
    assert.throws(() => controller.call('api.call', { name: 'nope' }), /No such api: nope/);
});

test('api.call refuses what the api only inherits', () => {
    const { controller } = setup(undefined, undefined, { icon() {} });
    for (const name of ['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf']) {
        assert.throws(() => controller.call('api.call', { name }), /No such api/, name);
    }
});

test('api.call refuses api entries that are not functions', () => {
    const { controller } = setup(undefined, undefined, { version: '1.0' });
    assert.throws(() => controller.call('api.call', { name: 'version' }), /No such api/);
});

test('api.call refuses a missing or odd name', () => {
    const { controller } = setup(undefined, undefined, { icon() {} });
    assert.throws(() => controller.call('api.call'), /No such api/);
    assert.throws(() => controller.call('api.call', {}), /No such api/);
    assert.throws(() => controller.call('api.call', { name: ['icon'] }), /No such api/);
});

test('api.call works with no api at all', () => {
    const { controller } = setup();
    assert.throws(() => controller.call('api.call', { name: 'icon' }), /No such api/);
});

test('api.call lets the api\'s own errors through', () => {
    const { controller } = setup(undefined, undefined, { bad() { throw new Error('nope'); } });
    assert.throws(() => controller.call('api.call', { name: 'bad' }), /nope/);
});

// ---- app.win --------------------------------------------------------------

test('win.close closes the popups first, then the window', () => {
    const { controller, host } = setup();
    assert.equal(controller.call('win.close'), null);
    assert.deepEqual(host.calls, ['closePopups', 'close']);
});

test('win.minimize minimizes', () => {
    const { controller, host } = setup();
    assert.equal(controller.call('win.minimize'), null);
    assert.deepEqual(host.calls, ['minimize']);
});

test('win.zoom maximizes a window that is not maximized', () => {
    const { controller, host } = setup();
    assert.equal(controller.call('win.zoom'), null);
    assert.deepEqual(host.calls, ['maximize']);
});

test('win.zoom restores a maximized window', () => {
    const { controller, host } = setup(fakeHost({ maximized: true }));
    controller.call('win.zoom');
    assert.deepEqual(host.calls, ['unmaximize']);
});

test('win.getState describes the window', () => {
    const { controller, host } = setup();
    assert.deepEqual(controller.call('win.getState'),
        { win: WIN_ID, fullscreen: false, maximized: false, minimized: false, focused: true });

    host.toplevel = { fullscreen: false, maximized: true, minimized: true };
    host.active = false;
    assert.deepEqual(controller.call('win.getState'),
        { win: 'main', fullscreen: false, maximized: true, minimized: true, focused: false });
});

test('win.getState: fullscreen is not maximized', () => {
    const { controller, host } = setup();
    host.toplevel = { fullscreen: true, maximized: true, minimized: false };
    const state = controller.call('win.getState');
    assert.equal(state.fullscreen, true);
    assert.equal(state.maximized, false);
});

test('win.getState gives booleans whatever the host gives', () => {
    const { controller, host } = setup();
    host.toplevel = {};
    host.active = undefined;
    assert.deepEqual(controller.state(),
        { win: 'main', fullscreen: false, maximized: false, minimized: false, focused: false });
});

test('win.startDrag does nothing before any press', () => {
    const { controller, host } = setup();
    assert.equal(controller.call('win.startDrag'), null);
    assert.deepEqual(host.calls, []);
});

test('win.startDrag moves with the last press', () => {
    const { controller, host } = setup();
    controller.recordPress('d1', 10, 20, 1);
    controller.recordPress('d2', 30, 40, 2);
    controller.call('win.startDrag');
    assert.deepEqual(host.calls, [['beginMove', 'd2', 30, 40, 2]]);
});

test('theme.get gives the desktop\'s dark setting', () => {
    const desktop = fakeDesktop(true);
    const { controller } = setup(undefined, desktop);
    assert.deepEqual(controller.call('theme.get'), { dark: true });
    desktop.dark = false;
    assert.deepEqual(controller.call('theme.get'), { dark: false });
});

test('unknown methods are refused', () => {
    const { controller, host } = setup();
    assert.throws(() => controller.call('win.explode'), /Unknown call: win.explode/);
    assert.throws(() => controller.call(), /Unknown call: undefined/);
    assert.deepEqual(host.calls, []);
});

// ---- window-state events ---------------------------------------------------

test('stateChanged tells the page the state', () => {
    const { controller, host } = setup();
    controller.stateChanged();
    assert.deepEqual(host.emitted, [{ name: 'window-state', detail: controller.state() }]);
});

test('stateChanged only tells the page about changes', () => {
    const { controller, host } = setup();
    controller.stateChanged();
    controller.stateChanged();
    host.toplevel = { maximized: true };
    controller.stateChanged();
    controller.stateChanged();
    assert.deepEqual(host.emitted.map((e) => e.detail.maximized), [false, true]);
});

test('activeChanged reports gaining the focus at once', () => {
    const { controller, host } = setup();
    host.active = false;
    controller.stateChanged();
    host.active = true;
    controller.activeChanged();
    assert.deepEqual(host.emitted.map((e) => e.detail.focused), [false, true]);
    assert.equal(host.timers.length, 0);
});

test('activeChanged reports losing the focus once it has lasted', () => {
    const { controller, host } = setup();
    controller.stateChanged();
    host.active = false;
    controller.activeChanged();
    assert.deepEqual(host.emitted.map((e) => e.detail.focused), [true]);
    assert.deepEqual(host.timers.map((t) => t.milliseconds), [FOCUS_LOSS_GRACE_MILLISECONDS]);

    host.flush();
    assert.deepEqual(host.emitted.map((e) => e.detail.focused), [true, false]);
});

test('activeChanged ignores a focus blip, as when a popover opens', () => {
    const { controller, host } = setup();
    controller.stateChanged();

    host.active = false;
    controller.activeChanged();
    host.active = true;
    controller.activeChanged();
    host.flush();

    assert.deepEqual(host.emitted.map((e) => e.detail.focused), [true]);
});

// ---- desktop style ---------------------------------------------------------

test('desktopStyleRequested sends the style to the page', () => {
    const { controller, host } = setup();
    controller.desktopStyleRequested();
    assert.deepEqual(host.page.get('__appDesktopStyle'), { buttonLayout: 'appmenu:close', accent: '#3584e4' });
    assert.deepEqual(host.page.events.map((e) => e.type), ['appdesktopstyle']);
});

test('a desktop change tells the page the theme', () => {
    const { host, desktop } = setup();
    desktop.change({ dark: true });
    assert.deepEqual(host.emitted, [{ name: 'theme', detail: { dark: true } }]);
});

test('a desktop change sends no style until the page has asked', () => {
    const { host, desktop } = setup();
    desktop.change({ accent: '#ff0000' });
    assert.equal(host.page.get('window.__appDesktopStyle'), undefined);
    assert.deepEqual(host.page.events, []);
});

test('a desktop change resends the style once the page has asked', () => {
    const { controller, host, desktop } = setup();
    controller.desktopStyleRequested();
    desktop.change({ accent: '', buttonLayout: 'close:' });
    assert.deepEqual(host.page.get('__appDesktopStyle'), { buttonLayout: 'close:', accent: null });
    assert.deepEqual(host.page.events.map((e) => e.type), ['appdesktopstyle', 'appdesktopstyle']);
    assert.deepEqual(host.emitted, [{ name: 'theme', detail: { dark: false } }]);
});
