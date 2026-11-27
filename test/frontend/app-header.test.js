import { assert, suite, test } from '../harness.js';
import { AppHeader } from '../../src/frontend/app-header.js';

suite('frontend/app-header');

test('Application title is App', async () => {

    const header = new AppHeader();

    assert.equal(header.title().text(), "App");
});
