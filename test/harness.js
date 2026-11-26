// The test runner, for gjs: gjs -m test/run.js. Prints TAP for meson.
//
//   import { assert, suite, test } from '../harness.js';
//   suite('launcher/paths');
//   test('name', async () => { assert.equal(1, 1); });
//
// test/run.js imports every test file, then calls run().

import System from 'system';

const tests = [];

const cleanups = [];

let currentSuite = '';

const TIMEOUT_MS = 5000;

// Tests from here on belong to `name`, shown as a heading in the output.
export function suite(name) {
    currentSuite = name;
}

export function test(name, fn) {
    tests.push({ suite: currentSuite, name, fn });
}

// fn() once every test has run.
export function afterAll(fn) {
    cleanups.push(fn);
}

export class AssertionError extends Error {
    name = 'AssertionError';
}

function fail(message) {
    throw new AssertionError(message);
}

const show = (v) => {
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return `[function ${v.name}]`;
    try { return JSON.stringify(v); }
    catch { return String(v); }
};

function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

// Whether `error` is what `expected` describes: a RegExp tested against the
// error as a string, or a class it is an instance of.
function errorMatches(error, expected) {
    if (expected === undefined) return true;
    if (expected instanceof RegExp) return expected.test(String(error));
    if (typeof expected === 'function') return error instanceof expected;
    throw new TypeError(`Can't match an error against ${show(expected)}`);
}

export const assert = {
    ok(value, message) {
        if (!value) fail(message ?? `expected truthy, got ${show(value)}`);
    },
    equal(actual, expected, message) {
        if (!Object.is(actual, expected)) {
            fail(message ?? `expected ${show(expected)}, got ${show(actual)}`);
        }
    },
    deepEqual(actual, expected, message) {
        if (!deepEqual(actual, expected)) {
            fail(message ?? `expected ${show(expected)}, got ${show(actual)}`);
        }
    },
    match(actual, regexp, message) {
        if (!regexp.test(String(actual))) fail(message ?? `expected ${show(actual)} to match ${regexp}`);
    },
    throws(fn, expected, message) {
        try {
            fn();
        }
        catch (e) {
            if (!errorMatches(e, expected)) {
                fail(message ?? `threw ${e}, expected ${expected}`);
            }
            return;
        }
        fail(message ?? `expected ${expected ?? 'an error'} to be thrown`);
    },
    async rejects(promise, expected, message) {
        try {
            await (typeof promise === 'function' ? promise() : promise);
        }
        catch (e) {
            if (!errorMatches(e, expected)) {
                fail(message ?? `rejected with ${e}, expected ${expected}`);
            }
            return;
        }
        fail(message ?? `expected a rejection with ${expected ?? 'an error'}`);
    },
    doesNotThrow(fn, message) {
        try {
            fn();
        }
        catch (e) {
            fail(message ?? `expected no error, got ${e}`);
        }
    },
};

function withTimeout(promise, name) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms: ${name}`)), TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Run the tests whose "suite: name" contains `filter` (all without one),
// print TAP, and exit 1 if any failed.
export async function run(filter = '') {
    const chosen = tests.filter((t) => `${t.suite}: ${t.name}`.includes(filter));
    print('TAP version 13');
    print(`1..${chosen.length}`);
    let failed = 0;
    let lastSuite = null;

    for (const [i, { suite: group, name, fn }] of chosen.entries()) {
        if (group !== lastSuite) {
            print(`# ${group || '(no suite)'}`);
            lastSuite = group;
        }
        const title = group ? `${group}: ${name}` : name;
        try {
            await withTimeout(Promise.resolve().then(fn), title);
            print(`ok ${i + 1} - ${title}`);
        }
        catch (e) {
            failed++;
            print(`not ok ${i + 1} - ${title}`);
            for (const line of `${e}\n${e?.stack ?? ''}`.trim().split('\n')) print(`  # ${line}`);
        }
    }

    for (const fn of cleanups) {
        try {
            await fn();
        }
        catch (e) {
            print(`# cleanup failed: ${e}`);
        }
    }

    print(`# pass ${chosen.length - failed}`);
    print(`# fail ${failed}`);
    System.exit(failed ? 1 : 0);
}
