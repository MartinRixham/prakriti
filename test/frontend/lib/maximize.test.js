import { assert, suite, test } from '../../harness.js';
import { Maximize } from '../../../src/frontend/lib/maximize.js'

suite('frontend/maximize');

test('Maximize small window on click', async () => {

    let maximized = false;

    const attributes = {};
    const element = {
        setAttribute: (name, value) => { attributes[name] = value; },
    };

    const maximize = new Maximize(
        { zoom: () => { maximized = true } },
        () => { },
        () => maximized);

    await maximize.control().update(element);

    assert.equal(element.title, 'Maximize');
    assert.equal(attributes['aria-label'], 'Maximize');

    maximize.control().click()
    await maximize.control().update(element);

    assert.ok(maximized);

    assert.equal(element.title, 'Restore');
    assert.equal(attributes['aria-label'], 'Restore');
});

test('Restore maximized window on click', async () => {

    let maximized = true;

    const attributes = {};
    const element = {
        setAttribute: (name, value) => { attributes[name] = value; },
    };

    const maximize = new Maximize(
        { zoom: () => { maximized = false } },
        () => { },
        () => maximized);

    await maximize.control().update(element);

    assert.equal(element.title, 'Restore');
    assert.equal(attributes['aria-label'], 'Restore');

    maximize.control().click()
    await maximize.control().update(element);

    assert.ok(!maximized);

    assert.equal(element.title, 'Maximize');
    assert.equal(attributes['aria-label'], 'Maximize');
});
