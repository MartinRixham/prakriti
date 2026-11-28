import { assert, suite, test } from '../harness.js';
import { PopupSession } from '../../src/launcher/popup-session.js';
import { fakePopover } from './fakes.js';

suite('launcher/popup-session');

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

test('a popup shows once its page has its size', () => {
    const { session, host } = setupSession();
    assert.equal(host.shown, null);
    session.pageMessage({ type: 'size', width: 200, height: 150 });
    assert.deepEqual(host.shown, { width: 200, height: 150 });
    assert.ok(session.shown);
});

test('a popup shows only once', () => {
    const { session, host } = setupSession();
    session.pageMessage({ type: 'size', width: 200, height: 150 });
    session.pageMessage({ type: 'size', width: 500, height: 500 });
    assert.deepEqual(host.shown, { width: 200, height: 150 });
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
    const session = new PopupSession('p', { onActivate() { }, onGone: () => events.push('gone') });
    session.close();
    assert.deepEqual(events, ['gone']);
});
