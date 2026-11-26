import { assert, suite, test } from '../../harness.js';
import { Close } from '../../../src/frontend/lib/close.js'

suite('frontend/close');


test('Close window on click', async () => {

    let closed = false;

    const attributes = {};
    const element = {
        setAttribute: (name, value) => { attributes[name] = value; },
    };

    const close = new Close({
        close() { closed = true }
    },
        () => { });

    await close.onBind(element);

    assert.equal(element.title, 'Close');
    assert.equal(attributes['aria-label'], 'Close');

    close.control().click()

    assert.ok(closed);
});
