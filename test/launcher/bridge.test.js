// The script the launcher injects into its pages (src/launcher/inject/
// bridge.js), run in a JavaScriptCore page.

import Gio from 'gi://Gio';

import { assert, suite, test } from '../harness.js';
import { Page } from '../page.js';

suite('launcher/bridge');

const BRIDGE = new TextDecoder().decode(
    Gio.File.new_for_uri(import.meta.url).get_parent().resolve_relative_path('../../src/launcher/inject/bridge.js')
        .load_contents(null)[1]);

// A page with the bridge in it, and the launcher's end of its handler:
// calls are recorded in __posted and answered by __reply(msg), which by
// default resolves with "reply:<method>". `reply` replaces it (JS source).
function loadBridge({ reply = '(msg) => Promise.resolve(`reply:${msg.method}`)' } = {}) {
    const page = new Page(`
        globalThis.__posted = [];
        globalThis.__reply = ${reply};
        window.webkit = {
            messageHandlers: {
                app: {
                    postMessage(msg) {
                        __posted.push(JSON.parse(JSON.stringify(msg)));
                        return __reply(msg);
                    },
                },
            },
        };

        // A mousedown on an element: \`within\` lists what target.closest()
        // finds, by what it is asked for ('drag' for [data-app-drag],
        // 'control' for the interactive elements and [data-app-nodrag]).
        globalThis.__mousedown = ({ button = 0, detail = 1, within = [], x = 100, y = 10 } = {}) => {
            const target = {
                closest(selector) {
                    if (selector === '[data-app-drag]') return within.includes('drag') ? {} : null;
                    if (selector.includes('button') && selector.includes('[data-app-nodrag]')) {
                        return within.includes('control') ? {} : null;
                    }
                    throw new Error('Unexpected selector: ' + selector);
                },
            };
            for (const fn of __listeners.mousedown ?? []) fn({ button, detail, target, screenX: x, screenY: y });
        };

        // The pointer moving to (x, y), with the primary button held or not.
        globalThis.__mousemove = ({ x, y, held = true }) => {
            for (const fn of __listeners.mousemove ?? []) fn({ screenX: x, screenY: y, buttons: held ? 1 : 0 });
        };

        globalThis.__mouseup = () => {
            for (const fn of __listeners.mouseup ?? []) fn({ button: 0 });
        };

        // What listeners hear, by name.
        globalThis.__heard = [];
    `);
    page.run(BRIDGE);
    return {
        page,
        get posted() { return page.get('__posted'); },
        get heard() { return page.get('__heard'); },
        emit: (name, detail) => page.run(`__appEmit(${JSON.stringify(name)}, ${JSON.stringify(detail)})`),
        mousedown: (opts) => page.run(`__mousedown(${JSON.stringify(opts)})`),
        mousemove: (opts) => page.run(`__mousemove(${JSON.stringify(opts)})`),
        mouseup: () => page.run('__mouseup()'),
    };
}

// ---- calls -----------------------------------------------------------------

test('app.api.call posts the name and args', () => {
    const bridge = loadBridge();
    const result = bridge.page.settle("app.api.call('icon', { file: 'a.svg' })");
    assert.deepEqual(bridge.posted, [{ method: 'api.call', args: { name: 'icon', args: { file: 'a.svg' } } }]);
    assert.deepEqual(result, { value: 'reply:api.call' });
});

test('app.api.call sends null args when given none', () => {
    const bridge = loadBridge();
    bridge.page.run("app.api.call('ping')");
    assert.deepEqual(bridge.posted, [{ method: 'api.call', args: { name: 'ping', args: null } }]);
});

test('app.api.call hands back the launcher\'s rejection', () => {
    const bridge = loadBridge({ reply: '() => Promise.reject(new Error("No such api: x"))' });
    assert.deepEqual(bridge.page.settle("app.api.call('x')"), { error: 'No such api: x' });
});

test('app.win calls post their methods with null args', () => {
    const bridge = loadBridge();
    bridge.page.run(`
        app.win.close();
        app.win.minimize();
        app.win.zoom();
        app.win.getState();
        app.win.startDrag();
        app.theme.get();
    `);
    const posted = bridge.posted;
    assert.deepEqual(posted.map((m) => m.method),
        ['win.close', 'win.minimize', 'win.zoom', 'win.getState', 'win.startDrag', 'theme.get']);
    assert.ok(posted.every((m) => m.args === null));
});

test('app.win methods work unbound, as the menu passes them', () => {
    const bridge = loadBridge();
    bridge.page.run('const { close } = app.win; close();');
    assert.deepEqual(bridge.posted, [{ method: 'win.close', args: null }]);
});

test('app.win.id is main', () => {
    assert.equal(loadBridge().page.get('app.win.id'), 'main');
});

test('app.win.getState resolves with the launcher\'s reply', () => {
    const bridge = loadBridge({ reply: '() => Promise.resolve({ win: "main", maximized: true })' });
    assert.deepEqual(bridge.page.settle('app.win.getState()'), { value: { win: 'main', maximized: true } });
});

// ---- events ----------------------------------------------------------------

test('app.win.onState hears window-state', () => {
    const bridge = loadBridge();
    bridge.page.run('app.win.onState((s) => __heard.push(s));');
    bridge.emit('window-state', { maximized: true });
    assert.deepEqual(bridge.heard, [{ maximized: true }]);
});

test('app.theme.on hears the dark setting alone', () => {
    const bridge = loadBridge();
    bridge.page.run('app.theme.on((dark) => __heard.push(dark));');
    bridge.emit('theme', { dark: true });
    bridge.emit('theme', { dark: false });
    assert.deepEqual(bridge.heard, [true, false]);
});

test('app.api.on hears any named event', () => {
    const bridge = loadBridge();
    bridge.page.run("app.api.on('custom', (d) => __heard.push(d));");
    bridge.emit('custom', 1);
    bridge.emit('other', 2);
    assert.deepEqual(bridge.heard, [1]);
});

test('listeners stop when unsubscribed', () => {
    const bridge = loadBridge();
    bridge.page.run('globalThis.__off = app.win.onState((s) => __heard.push(s));');
    bridge.emit('window-state', 1);
    bridge.page.run('__off();');
    bridge.emit('window-state', 2);
    assert.deepEqual(bridge.heard, [1]);
});

test('every listener hears the event', () => {
    const bridge = loadBridge();
    bridge.page.run(`
        app.api.on('e', () => __heard.push('a'));
        app.api.on('e', () => __heard.push('b'));
    `);
    bridge.emit('e');
    assert.deepEqual(bridge.heard, ['a', 'b']);
});

test('a failing listener does not stop the rest', () => {
    const bridge = loadBridge();
    bridge.page.run(`
        app.api.on('e', () => { throw new Error('listener broke'); });
        app.api.on('e', () => __heard.push('ran'));
    `);
    bridge.emit('e');
    assert.deepEqual(bridge.heard, ['ran']);
    const errors = bridge.page.errors;
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /listener broke/);
});

test('emitting with no listeners is fine', () => {
    const bridge = loadBridge();
    assert.doesNotThrow(() => bridge.emit('nobody-listens', {}));
});

test('the page cannot replace __appEmit', () => {
    const bridge = loadBridge();
    bridge.page.run(`
        app.api.on('e', (d) => __heard.push(d));
        window.__appEmit = () => {};
        delete window.__appEmit;
    `);
    bridge.emit('e', 'still');
    assert.deepEqual(bridge.heard, ['still']);
    assert.equal(bridge.page.get("Object.keys(window).includes('__appEmit')"), false);
});

test('in strict code, replacing __appEmit throws', () => {
    const bridge = loadBridge();
    assert.throws(() => bridge.page.run('"use strict"; window.__appEmit = null;'), /TypeError/);
});

// ---- drag regions ----------------------------------------------------------

test('a press in a drag region does not move the window by itself', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'] });
    bridge.mouseup();
    assert.deepEqual(bridge.posted, []);
});

test('dragging past the threshold from a drag region starts a drag', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'], x: 100, y: 10 });
    bridge.mousemove({ x: 103, y: 12 });
    assert.deepEqual(bridge.posted, []);
    bridge.mousemove({ x: 110, y: 10 });
    bridge.mousemove({ x: 130, y: 10 });
    assert.deepEqual(bridge.posted, [{ method: 'win.startDrag', args: null }]);
});

test('moving after the button is released does not drag', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'] });
    bridge.mouseup();
    bridge.mousemove({ x: 200, y: 200, held: false });
    assert.deepEqual(bridge.posted, []);
});

test('moving with the button no longer held does not drag', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'] });
    bridge.mousemove({ x: 200, y: 200, held: false });
    bridge.mousemove({ x: 300, y: 300 });
    assert.deepEqual(bridge.posted, []);
});

test('a double click in a drag region maximizes', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'] });
    bridge.mouseup();
    bridge.mousedown({ within: ['drag'], detail: 2 });
    assert.deepEqual(bridge.posted, [{ method: 'win.zoom', args: null }]);
});

test('dragging on the second press of a double click does not move', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'], detail: 2 });
    bridge.mousemove({ x: 200, y: 200 });
    assert.deepEqual(bridge.posted.map((m) => m.method), ['win.zoom']);
});

test('a triple click in a drag region can drag again', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'], detail: 3 });
    bridge.mousemove({ x: 200, y: 10 });
    assert.deepEqual(bridge.posted.map((m) => m.method), ['win.startDrag']);
});

test('presses outside drag regions are left alone', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: [] });
    bridge.mousedown({ within: [], detail: 2 });
    bridge.mousedown({ within: [] });
    bridge.mousemove({ x: 200, y: 200 });
    assert.deepEqual(bridge.posted, []);
});

test('controls inside a drag region are left alone', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag', 'control'] });
    bridge.mousedown({ within: ['drag', 'control'], detail: 2 });
    bridge.mousedown({ within: ['drag', 'control'] });
    bridge.mousemove({ x: 200, y: 200 });
    assert.deepEqual(bridge.posted, []);
});

test('only the primary button drags', () => {
    const bridge = loadBridge();
    bridge.mousedown({ within: ['drag'], button: 1 });
    bridge.mousedown({ within: ['drag'], button: 2 });
    bridge.mousemove({ x: 200, y: 200 });
    assert.deepEqual(bridge.posted, []);
});

test('the controls selector covers what a user interacts with', () => {
    const bridge = loadBridge();
    bridge.page.run(`
        __listeners.mousedown[0]({
            button: 0,
            detail: 1,
            target: {
                closest(s) {
                    if (s === '[data-app-drag]') return {};
                    globalThis.__selector = s;
                    return null;
                },
            },
        });
    `);
    const parts = bridge.page.get('__selector').split(',').map((s) => s.trim());
    for (const part of ['button', 'a', 'input', 'textarea', 'select', '[contenteditable]', '[data-app-nodrag]']) {
        assert.ok(parts.includes(part), part);
    }
});
