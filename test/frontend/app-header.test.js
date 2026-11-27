import { assert, suite, test } from '../harness.js';
import { AppHeader } from '../../src/frontend/app-header.js';

suite('frontend/app-header');

test('Set header bar', async () => {

    const header = new AppHeader();

    assert.equal(header.titleLabel().text(), "App");
});
