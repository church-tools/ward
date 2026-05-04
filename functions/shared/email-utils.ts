// import { BadRequestError, Env } from "./functions-utils";

// const MAILCHANNELS_SEND_URL = "https://api.mailchannels.net/tx/v1/send";
// const MAIL_FROM_NAME = "Ward Tools";

// type MailchannelsPayload = {
//     personalizations: {
//         to: { email: string }[];
//     }[];
//     from: {
//         email: string;
//         name: string;
//     };
//     subject: string;
//     content: {
//         type: "text/plain" | "text/html";
//         value: string;
//     }[];
// };

// export type EmailPayload = {
//     to: string;
//     subject: string;
//     text: string;
//     html?: string;
// };

// export async function sendEmail(env: Env, payload: EmailPayload) {
//     const appOrigin = env["APP_ORIGIN"];
//     if (typeof appOrigin !== "string" || !appOrigin)
//         throw new Error("Missing env variable: APP_ORIGIN");
//     const apiKey = env["MAILCHANNELS_API_KEY"];
//     if (typeof apiKey !== "string" || !apiKey)
//         throw new Error("Missing env variable: MAILCHANNELS_API_KEY");

//     const from = `noreply@${new URL(appOrigin).hostname}`;
//     const content: MailchannelsPayload["content"] = [
//         { type: "text/plain", value: payload.text },
//     ];

//     if (payload.html)
//         content.push({ type: "text/html", value: payload.html });

//     const response = await fetch(MAILCHANNELS_SEND_URL, {
//         method: "POST",
//         headers: {
//             "content-type": "application/json",
//             "X-Api-Key": apiKey,
//         },
//         body: JSON.stringify({
//             personalizations: [{ to: [{ email: payload.to }] }],
//             from: {
//                 email: from,
//                 name: MAIL_FROM_NAME,
//             },
//             subject: payload.subject,
//             content,
//         } satisfies MailchannelsPayload),
//     });

//     if (!response.ok) {
//         const errorBody = await response.text().catch(() => "");
//         throw new Error(`Mailchannels send failed (${response.status} ${response.statusText}): ${errorBody || "no response body"}`);
//     }
// }

// type PlaceholderPrimitive = string | number | boolean;
// type PlaceholderValue = PlaceholderPrimitive | { [key: string]: PlaceholderValue };

// export function replacePlaceholders<T extends Record<string, PlaceholderValue>>(template: string, values: T) {
//     const replaced = template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, keyPath: string) => {
//         let current: PlaceholderValue | undefined = values;
//         for (const keyPart of keyPath.split(".")) {
//             if (!current || typeof current !== "object" || Array.isArray(current) || !(keyPart in current))
//                 throw new Error(`Missing template variable: ${keyPath}`);
//             current = current[keyPart] as PlaceholderValue;
//         }
//         if (typeof current !== "string" && typeof current !== "number" && typeof current !== "boolean")
//             throw new Error(`Template variable is not a primitive value: ${keyPath}`);
//         return String(current)
//             .replace(/&/g, "&amp;")
//             .replace(/</g, "&lt;")
//             .replace(/>/g, "&gt;")
//             .replace(/\"/g, "&quot;")
//             .replace(/'/g, "&#39;");
//     });
//     const unresolved = replaced.match(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g);
//     if (unresolved && unresolved.length > 0)
//         throw new Error(`Unresolved template variables: ${unresolved.join(", ")}`);
//     return replaced;
// }

import { BadRequestError, Env } from "./functions-utils";

type SendEmailBinding = {
    send: (message: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html?: string;
    }) => Promise<void>;
};

export type EmailPayload = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

export async function sendEmail(env: Env, payload: EmailPayload) {
    const appOrigin = env["APP_ORIGIN"];
    if (typeof appOrigin !== "string" || !appOrigin)
        throw new Error("Missing env variable: APP_ORIGIN");
    const from = `noreply@${new URL(appOrigin).hostname}`;
    const binding = env["SEND_EMAIL"] as never as SendEmailBinding | undefined;
    if (!binding?.send)
        throw new Error("Missing SEND_EMAIL binding");

    await binding.send({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
    });
}

type PlaceholderPrimitive = string | number | boolean;
type PlaceholderValue = PlaceholderPrimitive | { [key: string]: PlaceholderValue };

export function replacePlaceholders<T extends Record<string, PlaceholderValue>>(template: string, values: T) {
    const replaced = template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, keyPath: string) => {
        let current: PlaceholderValue | undefined = values;
        for (const keyPart of keyPath.split(".")) {
            if (!current || typeof current !== "object" || Array.isArray(current) || !(keyPart in current))
                throw new Error(`Missing template variable: ${keyPath}`);
            current = current[keyPart] as PlaceholderValue;
        }
        if (typeof current !== "string" && typeof current !== "number" && typeof current !== "boolean")
            throw new Error(`Template variable is not a primitive value: ${keyPath}`);
        return String(current)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    });
    const unresolved = replaced.match(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g);
    if (unresolved && unresolved.length > 0)
        throw new Error(`Unresolved template variables: ${unresolved.join(", ")}`);
    return replaced;
}
