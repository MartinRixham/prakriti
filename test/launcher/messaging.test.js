// onMessage and onCall (src/launcher/messaging.js) with real JavaScriptCore
// values, and a fake user content manager and reply.

import JavaScriptCore from 'gi://JavaScriptCore?version=6.0';

import { onCall, onMessage } from '../../src/launcher/messaging.js';
import { assert, suite, test } from '../harness.js';

suite('launcher/messaging');

const context = new JavaScriptCore.Context();

// What a page's postMessage(...) hands the launcher.
const javaScriptValue = (source) => context.evaluate(`(${source})`, -1);

function fakeContentManager() {
    const contentManager = {
        handlers: {},
        registered: [],
        connect(signal, fn) { contentManager.handlers[signal] = fn; },
        register_script_message_handler: (name, world) => contentManager.registered.push(['plain', name, world]),
        register_script_message_handler_with_reply: (name, world) =>
            contentManager.registered.push(['reply', name, world]),
        post(name, source) {
            return contentManager.handlers[`script-message-received::${name}`](contentManager, javaScriptValue(source));
        },
        // Settles with how the call was answered.
        call(name, source) {
            return new Promise((resolve) => {
                const reply = {
                    return_value: (value) => resolve({ value: JSON.parse(value.to_json(0)) }),
                    return_error_message: (message) => resolve({ error: message }),
                };
                const handler = contentManager.handlers[`script-message-with-reply-received::${name}`];
                contentManager.returned = handler(contentManager, javaScriptValue(source), reply);
            });
        },
    };
    return contentManager;
}

// ---- onMessage -------------------------------------------------------------

test('onMessage registers the handler in the page\'s own world', () => {
    const contentManager = fakeContentManager();
    onMessage(contentManager, 'appPopup', () => {});
    assert.deepEqual(contentManager.registered, [['plain', 'appPopup', null]]);
    assert.deepEqual(Object.keys(contentManager.handlers), ['script-message-received::appPopup']);
});

test('onMessage hands on the message as plain JSON', () => {
    const contentManager = fakeContentManager();
    const seen = [];
    onMessage(contentManager, 'm', (msg) => seen.push(msg));
    contentManager.post('m', '{type: "open", anchor: {x: 1.5}, list: [1, "two", null], yes: true}');
    assert.deepEqual(seen, [{ type: 'open', anchor: { x: 1.5 }, list: [1, 'two', null], yes: true }]);
});

test('onMessage hands on undefined and null', () => {
    const contentManager = fakeContentManager();
    const seen = [];
    onMessage(contentManager, 'm', (msg) => seen.push(msg));
    contentManager.post('m', 'undefined');
    contentManager.post('m', 'null');
    assert.equal(seen.length, 2);
    assert.equal(seen[0], undefined);
    assert.equal(seen[1], null);
});

test('onMessage keeps a failing handler from reaching WebKit', () => {
    const contentManager = fakeContentManager();
    onMessage(contentManager, 'm', () => { throw new Error('expected in this test'); });
    contentManager.post('m', '{}');
});

// ---- onCall ----------------------------------------------------------------

test('onCall registers a handler with a reply', () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => {});
    assert.deepEqual(contentManager.registered, [['reply', 'app', null]]);
    assert.deepEqual(Object.keys(contentManager.handlers), ['script-message-with-reply-received::app']);
});

test('onCall answers with the result', async () => {
    const contentManager = fakeContentManager();
    let seen;
    onCall(contentManager, 'app', (msg) => { seen = msg; return { win: 'main', maximized: false }; });
    const answer = await contentManager.call('app', '{method: "win.getState", args: null}');
    assert.deepEqual(seen, { method: 'win.getState', args: null });
    assert.deepEqual(answer, { value: { win: 'main', maximized: false } });
});

test('onCall tells WebKit it will reply', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => 1);
    await contentManager.call('app', '{}');
    assert.equal(contentManager.returned, true);
});

test('onCall answers with what a promise resolves to', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => new Promise((resolve) => setTimeout(() => resolve('<svg/>'), 10)));
    assert.deepEqual(await contentManager.call('app', '{}'), { value: '<svg/>' });
});

test('onCall answers null for nothing', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => undefined);
    assert.deepEqual(await contentManager.call('app', '{}'), { value: null });
    onCall(contentManager, 'app', () => null);
    assert.deepEqual(await contentManager.call('app', '{}'), { value: null });
});

test('onCall answers null for what JSON cannot hold', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => () => {});
    assert.deepEqual(await contentManager.call('app', '{}'), { value: null });
});

test('onCall answers strings with awkward characters intact', async () => {
    const text = 'quote " backslash \\ newline \n unicode é  ';
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => text);
    assert.deepEqual(await contentManager.call('app', '{}'), { value: text });
});

test('onCall answers an error with its message', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => { throw new Error('No such api: x'); });
    assert.deepEqual(await contentManager.call('app', '{}'), { error: 'No such api: x' });
});

test('onCall answers a rejection with its message', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => Promise.reject(new Error('Bad icon path')));
    assert.deepEqual(await contentManager.call('app', '{}'), { error: 'Bad icon path' });
});

test('onCall answers each call on its own', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', (msg) => new Promise((resolve) => setTimeout(() => resolve(msg.n * 10), 30 - msg.n * 10)));
    const answers = await Promise.all([1, 2].map((n) => contentManager.call('app', `{n: ${n}}`)));
    assert.deepEqual(answers, [{ value: 10 }, { value: 20 }]);
});

test('onCall hands on undefined', async () => {
    const contentManager = fakeContentManager();
    const seen = [];
    onCall(contentManager, 'app', (msg) => { seen.push(msg); });
    await contentManager.call('app', 'undefined');
    assert.equal(seen.length, 1);
    assert.equal(seen[0], undefined);
});

test('onCall keeps falsy results', async () => {
    const contentManager = fakeContentManager();
    for (const result of [0, false, '']) {
        onCall(contentManager, 'app', () => result);
        assert.deepEqual(await contentManager.call('app', '{}'), { value: result });
    }
});

test('onCall answers a thrown non-error as a string', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => { throw 'plain'; });
    assert.deepEqual(await contentManager.call('app', '{}'), { error: 'plain' });
    onCall(contentManager, 'app', () => Promise.reject(42));
    assert.deepEqual(await contentManager.call('app', '{}'), { error: '42' });
});

test('onCall answers an error for a result JSON refuses', async () => {
    const contentManager = fakeContentManager();
    onCall(contentManager, 'app', () => 1n);
    const { error } = await contentManager.call('app', '{}');
    assert.match(error, /BigInt/);
});

// A value whose JSON does not parse, which no real JavaScriptCore value gives.
const badValue = { to_json: () => '{nope', get_context: () => context };

test('onCall answers a message that is not JSON with an error, without calling', () => {
    const contentManager = fakeContentManager();
    let called = false;
    onCall(contentManager, 'app', () => { called = true; });
    let answer;
    const reply = { return_error_message: (message) => { answer = message; } };
    const returned = contentManager.handlers['script-message-with-reply-received::app'](contentManager, badValue, reply);
    assert.equal(returned, true);
    assert.match(answer, /^Bad message: /);
    assert.equal(called, false);
});

test('onMessage drops a message that is not JSON', () => {
    const contentManager = fakeContentManager();
    let called = false;
    onMessage(contentManager, 'm', () => { called = true; });
    contentManager.handlers['script-message-received::m'](contentManager, badValue);
    assert.equal(called, false);
});
