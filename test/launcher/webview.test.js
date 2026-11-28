import { assert, suite, test } from '../harness.js';
import { Page } from '../page.js';
import { fireEvent } from '../../src/launcher/webview.js';

suite('launcher/webview');

// A web view that runs what it is asked to in a page.
function fakeView(setup) {
    const page = new Page(setup);
    return { page, evaluate_javascript: (script) => page.run(script) };
}

test('fireEvent dispatches a CustomEvent with the detail', () => {
    const view = fakeView();
    fireEvent(view, 'apppopup', { id: 'm', value: [0, 1] });
    assert.deepEqual(view.page.events, [{ type: 'apppopup', detail: { id: 'm', value: [0, 1] } }]);
});

test('fireEvent makes a real CustomEvent', () => {
    const view = fakeView('addEventListener("x", (e) => { globalThis.__isCustom = e instanceof CustomEvent; });');
    fireEvent(view, 'x', 1);
    assert.equal(view.page.get('__isCustom'), true);
});

test('fireEvent survives awkward strings', () => {
    const view = fakeView();
    const nasty = `quote " apostrophe ' backslash \\ newline \n </script>   ${'${x}'}`;
    fireEvent(view, `name'"`, { nasty });
    assert.deepEqual(view.page.events, [{ type: `name'"`, detail: { nasty } }]);
});

test('fireEvent gives null for an undefined detail', () => {
    const view = fakeView();
    fireEvent(view, 'x');
    assert.deepEqual(view.page.events, [{ type: 'x', detail: null }]);
});
