import { assert, suite, test } from '../../harness.js';
import { Minimize } from '../../../src/frontend/lib/minimize.js'

suite('frontend/minimize');


test('Minimize window on click', async () => {

    let minimized = false;

    const attributes = {};
    const element = {
        setAttribute: (name, value) => { attributes[name] = value; },
    };

    const minimize = new Minimize({
        minimize() { minimized = true }
    },
        () => { });

    await minimize.onBind(element);

    assert.equal(element.title, 'Minimize');
    assert.equal(attributes['aria-label'], 'Minimize');

    minimize.control().click()

    assert.ok(minimized);
});
