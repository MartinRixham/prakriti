import JavaScriptCore from 'gi://JavaScriptCore?version=6.0';

function parseMessage(json) {
    return json === null || json === undefined ? undefined : JSON.parse(json);
}

async function answerCall(callback, message) {
    try {
        const result = await callback(message);
        return { json: JSON.stringify(result ?? null) ?? 'null' };
    }
    catch (event) {
        return { error: String(event?.message ?? event) };
    }
}

export function onMessage(contentManager, name, fn) {
    contentManager.connect(`script-message-received::${name}`, (_contentManager, value) => {
        try {
            fn(parseMessage(value.to_json(0)));
        }
        catch (e) {
            logError(e, `${name} message`);
        }
    });
    contentManager.register_script_message_handler(name, null);
}

export function onCall(contentManager, name, fn) {
    contentManager.connect(`script-message-with-reply-received::${name}`, (_contentManager, value, reply) => {
        const context = value.get_context();
        let msg;
        try {
            msg = parseMessage(value.to_json(0));
        }
        catch (e) {
            reply.return_error_message(`Bad message: ${e.message}`);
            return true;
        }
        answerCall(fn, msg).then((answer) => {
            if (answer.error !== undefined) reply.return_error_message(answer.error);
            else reply.return_value(JavaScriptCore.Value.new_from_json(context, answer.json));
        });
        return true;
    });
    contentManager.register_script_message_handler_with_reply(name, null);
}
