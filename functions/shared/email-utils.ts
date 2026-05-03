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
    const from = env["MAIL_FROM"];
    if (typeof from !== "string" || !from)
        throw new Error("Missing env variable: MAIL_FROM");

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

export function requireEmail(value: string | null | undefined, field: string) {
    if (!value)
        throw new BadRequestError(`${field} is required`);

    const normalized = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
        throw new BadRequestError(`${field} is invalid`);

    return normalized;
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
