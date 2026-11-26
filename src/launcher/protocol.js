export function parseMessage(json) {
    return json === null || json === undefined ? undefined : JSON.parse(json);
}

// Answer a call: fn(msg)'s result, awaited, as JSON, or the error message
// if it throws or rejects. Never rejects itself. What JSON can't hold (a
// function, a symbol) answers null, as it would inside an object.
export async function answerCall(fn, msg) {
    try {
        const result = await fn(msg);
        return { json: JSON.stringify(result ?? null) ?? 'null' };
    }
    catch (e) {
        return { error: String(e?.message ?? e) };
    }
}

// A CustomEvent on the page's window.
export function eventScript(name, detail) {
    return `window.dispatchEvent(new CustomEvent(${JSON.stringify(name)},{detail:${JSON.stringify(detail ?? null)}}))`;
}

// One of the injected bridge's own events (app.api.on and friends).
export function emitScript(name, detail) {
    return `window.__appEmit?.(${JSON.stringify(name)},${JSON.stringify(detail ?? null)})`;
}

// The desktop style, as the page reads it: '' (unknown) becomes null.
export function desktopStyleScript({ buttonLayout, accent }) {
    const style = { buttonLayout: buttonLayout || null, accent: accent || null };
    return `window.__appDesktopStyle=${JSON.stringify(style)};window.dispatchEvent(new Event('appdesktopstyle'))`;
}

// What a popup page finds before its own scripts run.
export function popupInitScript(id, data) {
    return `window.__appPopup=${JSON.stringify({ id, data: data ?? null })};`;
}
