import { assert, suite, test } from '../harness.js';
import { Page } from '../page.js';
import {
    answerCall, desktopStyleScript, emitScript, eventScript, parseMessage, popupInitScript,
} from '../../src/launcher/protocol.js';

suite('launcher/protocol');

test('parseMessage reads JSON', () => {
    assert.deepEqual(parseMessage('{"method":"x","args":[1,"two",null]}'),
        { method: 'x', args: [1, 'two', null] });
    assert.equal(parseMessage('"text"'), 'text');
    assert.equal(parseMessage('3'), 3);
});

test('parseMessage gives undefined for undefined', () => {
    // JavaScriptCore's to_json() gives null for undefined.
    assert.equal(parseMessage(null), undefined);
    assert.equal(parseMessage(undefined), undefined);
});

test('parseMessage throws on bad JSON', () => {
    assert.throws(() => parseMessage('{nope'), SyntaxError);
});

test('answerCall answers with the result as JSON', async () => {
    let seen;
    const answer = await answerCall((msg) => { seen = msg; return { a: [1, 2] }; }, { q: 1 });
    assert.deepEqual(seen, { q: 1 });
    assert.deepEqual(answer, { json: '{"a":[1,2]}' });
});

test('answerCall awaits a promised result', async () => {
    assert.deepEqual(await answerCall(async () => 'later'), { json: '"later"' });
});

test('answerCall answers null for undefined and null', async () => {
    assert.deepEqual(await answerCall(() => undefined), { json: 'null' });
    assert.deepEqual(await answerCall(() => null), { json: 'null' });
});

test('answerCall answers null for what JSON cannot hold', async () => {
    assert.deepEqual(await answerCall(() => () => 1), { json: 'null' });
    assert.deepEqual(await answerCall(() => Symbol('s')), { json: 'null' });
});

test('answerCall keeps falsy results', async () => {
    assert.deepEqual(await answerCall(() => 0), { json: '0' });
    assert.deepEqual(await answerCall(() => false), { json: 'false' });
    assert.deepEqual(await answerCall(() => ''), { json: '""' });
});

test('answerCall answers an error with its message', async () => {
    assert.deepEqual(await answerCall(() => { throw new Error('boom'); }), { error: 'boom' });
});

test('answerCall answers a rejection with its message', async () => {
    assert.deepEqual(await answerCall(async () => { throw new TypeError('bad'); }), { error: 'bad' });
});

test('answerCall answers a thrown non-error as a string', async () => {
    assert.deepEqual(await answerCall(() => { throw 'plain'; }), { error: 'plain' });
    assert.deepEqual(await answerCall(() => Promise.reject(42)), { error: '42' });
});

test('answerCall answers an error for a result JSON refuses', async () => {
    const { error } = await answerCall(() => 1n);
    assert.match(error, /BigInt/);
});

test('eventScript dispatches a CustomEvent with the detail', () => {
    const page = new Page();
    page.run(eventScript('apppopup', { id: 'm', value: [0, 1] }));
    assert.deepEqual(page.events, [{ type: 'apppopup', detail: { id: 'm', value: [0, 1] } }]);
});

test('eventScript makes a real CustomEvent', () => {
    const page = new Page('addEventListener("x", (e) => { globalThis.__isCustom = e instanceof CustomEvent; });');
    page.run(eventScript('x', 1));
    assert.equal(page.get('__isCustom'), true);
});

test('eventScript survives awkward strings', () => {
    const page = new Page();
    const nasty = `quote " apostrophe ' backslash \\ newline \n </script>   ${'${x}'}`;
    page.run(eventScript(`name'"`, { nasty }));
    assert.deepEqual(page.events, [{ type: `name'"`, detail: { nasty } }]);
});

test('eventScript gives null for an undefined detail', () => {
    const page = new Page();
    page.run(eventScript('x'));
    assert.deepEqual(page.events, [{ type: 'x', detail: null }]);
});

test('emitScript calls the bridge with name and detail', () => {
    const page = new Page('globalThis.__calls = []; window.__appEmit = (name, detail) => __calls.push([name, detail]);');
    page.run(emitScript('window-state', { maximized: true }));
    page.run(emitScript('theme'));
    assert.deepEqual(page.get('__calls'), [['window-state', { maximized: true }], ['theme', null]]);
});

test('emitScript does nothing without the bridge', () => {
    const page = new Page();
    assert.doesNotThrow(() => page.run(emitScript('theme', { dark: true })));
});

test('desktopStyleScript sets the style and fires appdesktopstyle', () => {
    const page = new Page();
    page.run(desktopStyleScript('appmenu:close', '#3584e4'));
    assert.deepEqual(page.get('__appDesktopStyle'), { buttonLayout: 'appmenu:close', accent: '#3584e4' });
    assert.deepEqual(page.events, [{ type: 'appdesktopstyle' }]);
});

test('desktopStyleScript fires a plain Event', () => {
    const page = new Page('addEventListener("appdesktopstyle", (e) => { globalThis.__kind = [e instanceof Event, e instanceof CustomEvent]; });');
    page.run(desktopStyleScript('', ''));
    assert.deepEqual(page.get('__kind'), [true, false]);
});

test('desktopStyleScript gives null for what is unknown', () => {
    const page = new Page();
    page.run(desktopStyleScript('', ''));
    assert.deepEqual(page.get('__appDesktopStyle'), { buttonLayout: null, accent: null });
});

test('popupInitScript gives the popup its id and data', () => {
    const page = new Page();
    page.run(popupInitScript('main-menu', { sections: [['A']], dark: true }));
    assert.deepEqual(page.get('__appPopup'), { id: 'main-menu', data: { sections: [['A']], dark: true } });
});

test('popupInitScript gives null for no data', () => {
    const page = new Page();
    page.run(popupInitScript('p'));
    assert.deepEqual(page.get('__appPopup'), { id: 'p', data: null });
});
