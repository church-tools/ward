
import { Env } from "./functions-utils";

export type EmailPayload = {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    headers?: Record<string, string>;
};

export async function sendEmail(env: Env, payload: EmailPayload) {
    const appOrigin = env["APP_ORIGIN"] ?? "";
    if (!appOrigin) throw new Error("Missing env variable: APP_ORIGIN");
    const from = `Ward Tools <noreply@${new URL(appOrigin).hostname}>`;
    const accountId = env["ACCOUNT_ID"] ?? "";
    if (!accountId) throw new Error("Missing env variable: ACCOUNT_ID");

    const resendApiKey = env["RESEND_API_KEY"] ?? "";
    if (!resendApiKey) throw new Error("Missing env variable: RESEND_API_KEY");
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const res = await resend.emails.send({
        from,
        to: payload.to,
        ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
        ...(payload.headers ? { headers: payload.headers } : {}),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
    });
    if (res.error)
        throw new Error(`Failed to send email: ${res.error.message}`);
}

type PlaceholderPrimitive = string | number | boolean;
type PlaceholderValue = PlaceholderPrimitive | { [key: string]: PlaceholderValue };

export function fillTemplate<T extends Record<string, PlaceholderValue>>(template: string, values: T) {
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
