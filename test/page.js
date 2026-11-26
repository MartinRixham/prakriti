// A page for the tests to run page scripts in: a JavaScriptCore context,
// the engine WebKit runs the app's pages on, with just enough of `window`
// for the launcher's scripts. Everything the page does stays inside it;
// tests drive it with run() and read it back as JSON with get().
//
// The page has:
//   window                     the global object
//   Event, CustomEvent         {type, detail}
//   addEventListener(type, fn), dispatchEvent(event)
//   __listeners                type → listeners
//   __events                   every event dispatched, as {type, detail}
//   __errors                   console.error calls, each an array of strings

import JavaScriptCore from 'gi://JavaScriptCore?version=6.0';

const PRELUDE = `
globalThis.window = globalThis;

class Event {
    constructor(type) { this.type = type; }
}
class CustomEvent extends Event {
    constructor(type, { detail = null } = {}) {
        super(type);
        this.detail = detail;
    }
}
globalThis.Event = Event;
globalThis.CustomEvent = CustomEvent;

globalThis.__listeners = {};
globalThis.__events = [];
globalThis.__errors = [];

globalThis.addEventListener = (type, fn) => {
    (__listeners[type] ??= []).push(fn);
};
globalThis.dispatchEvent = (event) => {
    __events.push({ type: event.type, detail: event.detail });
    for (const fn of __listeners[event.type] ?? []) fn(event);
    return true;
};
console.error = (...args) => { __errors.push(args.map(String)); };
`;

export class Page {

    #context = new JavaScriptCore.Context();

    constructor(setup = '') {
        this.run(PRELUDE);
        if (setup) this.run(setup);
    }

    // Evaluate `js` in the page; the page's exceptions are thrown here.
    // The page's promise jobs have all run by the time this returns.
    run(js) {
        const value = this.#context.evaluate(js, -1);
        const exception = this.#context.get_exception();
        if (exception) {
            this.#context.clear_exception();
            throw new Error(`${exception.get_name()}: ${exception.get_message()}`);
        }
        return value;
    }

    // The value of the expression `expr`, through JSON.
    get(expr) {
        const json = this.run(`JSON.stringify(${expr})`);
        return json.is_undefined() ? undefined : JSON.parse(json.to_string());
    }

    // What the promise from the expression `expr` settles with:
    // {value} or {error: message}, or undefined while it is pending.
    settle(expr) {
        this.run(`globalThis.__settled = undefined;
            Promise.resolve().then(() => ${expr}).then(
                (value) => { __settled = { value }; },
                (e) => { __settled = { error: String(e?.message ?? e) }; });`);
        return this.get('__settled');
    }

    get events() {
        return this.get('__events');
    }

    get errors() {
        return this.get('__errors');
    }
}
