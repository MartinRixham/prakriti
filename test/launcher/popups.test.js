import { assert, suite, test } from '../harness.js';
import { Popups } from '../../src/launcher/popups.js';
import { fakePopover } from './fakes.js';

suite('launcher/popups');

function setupPopups(uri = 'app://main/index.html') {
    const fired = [];
    const hosts = [];
    const opener = {
        uri: () => uri,
        fireEvent: (name, detail) => fired.push({ name, detail }),
    };
    const popups = new Popups(opener, (id, uri, anchor, data, session) => {
        const host = fakePopover(session);
        host.spec = { id, uri, anchor, data };
        hosts.push(host);
        return host;
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
    const { popups, hosts } = setupPopups(null);
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
