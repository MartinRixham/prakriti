import { assert, suite, test } from '../harness.js';
import { PopupSession, Popups, scaleAnchor } from '../../src/launcher/popups.js';

suite('launcher/popups');

// A popover as GTK runs it: popdown() reports closed() back, as the
// popover's 'closed' signal does.
function fakePopover(session) {
    const host = {
        session,
        shown: null,
        popdowns: 0,
        disposed: 0,
        show(width, height) { host.shown = { width, height }; },
        popdown() {
            host.popdowns++;
            session.closed();
        },
        dispose() { host.disposed++; },
    };
    return host;
}

function setupSession() {
    const events = [];
    const session = new PopupSession('menu', {
        onActivate: (value) => events.push(['activate', value]),
        onGone: () => events.push(['gone']),
    });
    const host = fakePopover(session);
    session.start(host);
    return { session, host, events };
}

function setupPopups({ uri = 'app://main/index.html', zoom = 1 } = {}) {
    const fired = [];
    const hosts = [];
    const opener = {
        uri: () => uri,
        zoom: () => zoom,
        fireEvent: (name, detail) => fired.push({ name, detail }),
    };
    const popups = new Popups({
        opener,
        createHost(spec, session) {
            const host = fakePopover(session);
            host.spec = spec;
            hosts.push(host);
            return host;
        },
    });
    return { popups, fired, hosts };
}

const OPEN = {
    type: 'open',
    id: 'main-menu',
    page: 'lib/html/menu-popup.html',
    anchor: { x: 939, y: 26, width: 34, height: 34 },
    data: { sections: [['Quit']] },
};

// ---- scaleAnchor -----------------------------------------------------------

test('scaleAnchor keeps CSS px at zoom 1, rounded', () => {
    assert.deepEqual(scaleAnchor({ x: 10.4, y: 20.6, width: 33.5, height: 34 }, 1),
        { x: 10, y: 21, width: 34, height: 34 });
});

test('scaleAnchor scales by the zoom', () => {
    assert.deepEqual(scaleAnchor({ x: 10, y: 20, width: 30, height: 40 }, 1.5),
        { x: 15, y: 30, width: 45, height: 60 });
});

test('scaleAnchor makes the anchor at least 1px', () => {
    assert.deepEqual(scaleAnchor({ x: 5, y: 5, width: 0, height: -3 }, 1),
        { x: 5, y: 5, width: 1, height: 1 });
});

test('scaleAnchor reads a missing or broken anchor as 0', () => {
    const corner = { x: 0, y: 0, width: 1, height: 1 };
    assert.deepEqual(scaleAnchor(undefined, 1), corner);
    assert.deepEqual(scaleAnchor(null, 1), corner);
    assert.deepEqual(scaleAnchor('anchor', 1), corner);
    assert.deepEqual(scaleAnchor({ x: '10', y: NaN, width: Infinity, height: null }, 1), corner);
});

test('scaleAnchor treats a bad zoom as 1', () => {
    const a = { x: 10, y: 10, width: 10, height: 10 };
    for (const zoom of [0, -2, NaN, undefined, Infinity]) {
        assert.deepEqual(scaleAnchor(a, zoom), a, String(zoom));
    }
});

// ---- PopupSession ----------------------------------------------------------

test('a popup shows once its page has its size', () => {
    const { session, host } = setupSession();
    assert.equal(host.shown, null);
    session.pageMessage({ type: 'size', width: 199.2, height: 151.01 });
    assert.deepEqual(host.shown, { width: 200, height: 152 });
    assert.ok(session.shown);
});

test('a popup shows only once', () => {
    const { session, host } = setupSession();
    session.pageMessage({ type: 'size', width: 200, height: 150 });
    session.pageMessage({ type: 'size', width: 500, height: 500 });
    assert.deepEqual(host.shown, { width: 200, height: 150 });
});

test('a popup is at least 1px whatever its page says', () => {
    const { session, host } = setupSession();
    session.pageMessage({ type: 'size', width: 'wide', height: -4 });
    assert.deepEqual(host.shown, { width: 1, height: 1 });
});

test('activating hands the value on and closes the popup', () => {
    const { session, host, events } = setupSession();
    session.pageMessage({ type: 'size', width: 10, height: 10 });
    session.pageMessage({ type: 'activate', value: [1, 0] });
    assert.deepEqual(events, [['activate', [1, 0]], ['gone']]);
    assert.equal(host.popdowns, 1);
    assert.equal(host.disposed, 1);
    assert.ok(session.gone);
});

test('activating without a value gives null', () => {
    const { session, events } = setupSession();
    session.pageMessage({ type: 'activate' });
    assert.deepEqual(events[0], ['activate', null]);
});

test('the page can close its popup', () => {
    const { session, host, events } = setupSession();
    session.pageMessage({ type: 'size', width: 10, height: 10 });
    session.pageMessage({ type: 'close' });
    assert.equal(host.popdowns, 1);
    assert.deepEqual(events, [['gone']]);
});

test('closing a popup that never showed needs no popdown', () => {
    const { session, host, events } = setupSession();
    session.close();
    assert.equal(host.popdowns, 0);
    assert.equal(host.disposed, 1);
    assert.deepEqual(events, [['gone']]);
});

test('GTK closing the popover ends the popup', () => {
    const { session, host, events } = setupSession();
    session.pageMessage({ type: 'size', width: 10, height: 10 });
    session.closed();     // a click outside
    assert.equal(host.popdowns, 0);
    assert.equal(host.disposed, 1);
    assert.deepEqual(events, [['gone']]);
});

test('a popup goes only once', () => {
    const { session, host, events } = setupSession();
    session.pageMessage({ type: 'size', width: 10, height: 10 });
    session.close();
    session.close();
    session.closed();
    session.pageMessage({ type: 'close' });
    assert.equal(host.popdowns, 1);
    assert.equal(host.disposed, 1);
    assert.deepEqual(events, [['gone']]);
});

test('a gone popup ignores its page', () => {
    const { session, host, events } = setupSession();
    session.close();
    session.pageMessage({ type: 'size', width: 10, height: 10 });
    session.pageMessage({ type: 'activate', value: 1 });
    assert.equal(host.shown, null);
    assert.deepEqual(events, [['gone']]);
});

test('a popup ignores messages it does not understand', () => {
    const { session, host, events } = setupSession();
    for (const msg of [undefined, null, 'size', 42, [], {}, { type: 'explode' }]) {
        session.pageMessage(msg);
    }
    assert.equal(host.shown, null);
    assert.deepEqual(events, []);
    assert.ok(!session.gone);
});

test('a popup closed before it has a host still goes', () => {
    const events = [];
    const session = new PopupSession('p', { onActivate() {}, onGone: () => events.push('gone') });
    session.close();
    assert.deepEqual(events, ['gone']);
});

// ---- Popups ----------------------------------------------------------------

test('open makes a popover for the page beside the opener', () => {
    const { popups, hosts } = setupPopups();
    popups.handle(OPEN);
    assert.equal(hosts.length, 1);
    assert.deepEqual(hosts[0].spec, {
        id: 'main-menu',
        uri: 'app://main/lib/html/menu-popup.html',
        anchor: { x: 939, y: 26, width: 34, height: 34 },
        data: { sections: [['Quit']] },
    });
    assert.deepEqual(popups.open.map((s) => s.id), ['main-menu']);
});

test('open scales the anchor by the opener\'s zoom', () => {
    const { popups, hosts } = setupPopups({ zoom: 2 });
    popups.handle(OPEN);
    assert.deepEqual(hosts[0].spec.anchor, { x: 1878, y: 52, width: 68, height: 68 });
});

test('open gives null data when there is none', () => {
    const { popups, hosts } = setupPopups();
    popups.handle({ ...OPEN, data: undefined });
    assert.equal(hosts[0].spec.data, null);
});

test('open refuses a missing or odd id', () => {
    const { popups, hosts } = setupPopups();
    for (const id of [undefined, '', 7, ['main-menu'], { id: 'x' }]) {
        popups.handle({ ...OPEN, id });
    }
    assert.equal(hosts.length, 0);
});

test('open refuses pages outside the opener\'s directory', () => {
    const { popups, hosts } = setupPopups();
    for (const page of ['../x.html', '/etc/passwd', 'https://example.com/', '', undefined]) {
        popups.handle({ ...OPEN, page });
    }
    assert.equal(hosts.length, 0);
});

test('open does nothing while the opener has no page', () => {
    const { popups, hosts } = setupPopups({ uri: null });
    popups.handle(OPEN);
    assert.equal(hosts.length, 0);
});

test('reopening an id closes the old popup first', () => {
    const { popups, hosts, fired } = setupPopups();
    popups.handle(OPEN);
    hosts[0].session.pageMessage({ type: 'size', width: 10, height: 10 });
    popups.handle(OPEN);

    assert.equal(hosts.length, 2);
    assert.equal(hosts[0].popdowns, 1);
    assert.deepEqual(fired, [{ name: 'apppopup', detail: { id: 'main-menu', type: 'closed' } }]);
    // The old one going leaves the new one in place.
    assert.equal(popups.open.length, 1);
    assert.equal(popups.open[0], hosts[1].session);
});

test('an old popup closing late leaves its replacement open', () => {
    const { popups, hosts, fired } = setupPopups();
    popups.handle(OPEN);
    const old = hosts[0];
    old.session.pageMessage({ type: 'size', width: 10, height: 10 });
    // This popover reports closed() some time after popdown().
    old.popdown = () => { old.popdowns++; };

    popups.handle(OPEN);
    old.session.closed();

    assert.equal(popups.open.length, 1);
    assert.equal(popups.open[0], hosts[1].session);
    assert.deepEqual(fired, [{ name: 'apppopup', detail: { id: 'main-menu', type: 'closed' } }]);

    // And the replacement still closes by id.
    popups.handle({ type: 'close', id: 'main-menu' });
    assert.deepEqual(popups.open, []);
});

test('popups with different ids stay open together', () => {
    const { popups } = setupPopups();
    popups.handle(OPEN);
    popups.handle({ ...OPEN, id: 'other' });
    assert.deepEqual(popups.open.map((s) => s.id), ['main-menu', 'other']);
});

test('the opener hears what its popup chose, then that it has gone', () => {
    const { popups, hosts, fired } = setupPopups();
    popups.handle(OPEN);
    hosts[0].session.pageMessage({ type: 'size', width: 10, height: 10 });
    hosts[0].session.pageMessage({ type: 'activate', value: [0, 2] });
    assert.deepEqual(fired, [
        { name: 'apppopup', detail: { id: 'main-menu', type: 'activate', value: [0, 2] } },
        { name: 'apppopup', detail: { id: 'main-menu', type: 'closed' } },
    ]);
    assert.deepEqual(popups.open, []);
});

test('the opener hears when GTK closes its popup', () => {
    const { popups, hosts, fired } = setupPopups();
    popups.handle(OPEN);
    hosts[0].session.closed();
    assert.deepEqual(fired, [{ name: 'apppopup', detail: { id: 'main-menu', type: 'closed' } }]);
    assert.deepEqual(popups.open, []);
});

test('the opener can close a popup by id', () => {
    const { popups, hosts } = setupPopups();
    popups.handle(OPEN);
    hosts[0].session.pageMessage({ type: 'size', width: 10, height: 10 });
    popups.handle({ type: 'close', id: 'main-menu' });
    assert.equal(hosts[0].popdowns, 1);
    assert.deepEqual(popups.open, []);
});

test('closing an id that is not open does nothing', () => {
    const { popups, fired } = setupPopups();
    assert.doesNotThrow(() => popups.handle({ type: 'close', id: 'nothing' }));
    assert.deepEqual(fired, []);
});

test('closeAll closes every popup', () => {
    const { popups, hosts, fired } = setupPopups();
    popups.handle(OPEN);
    popups.handle({ ...OPEN, id: 'other' });
    hosts[0].session.pageMessage({ type: 'size', width: 10, height: 10 });
    popups.closeAll();
    assert.deepEqual(popups.open, []);
    assert.equal(hosts[0].popdowns, 1);
    assert.equal(hosts[1].disposed, 1);
    assert.equal(fired.length, 2);
});

test('the opener\'s odd messages are ignored', () => {
    const { popups, hosts } = setupPopups();
    for (const msg of [undefined, null, 'open', 3, {}, { type: 'explode', id: 'x' }]) {
        popups.handle(msg);
    }
    assert.equal(hosts.length, 0);
});
