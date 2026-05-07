
import type { LanguageKey } from "@/shared/language/language.service";
import { fillTemplate, sendEmail } from "@root/functions/shared/email-utils";
import { BadRequestError, type Env, getSupabaseService } from "@root/functions/shared/functions-utils";
import type { GenerateLinkParams } from "@supabase/supabase-js";
import AUTH_EMAIL_TEMPLATE_HTML from "./auth-email-template.html";
import { AUTH_EMAIL_LOCALIZATION as AUTH_EMAIL_LOCALIZATION_DE } from "./localization/auth-email-localization.de";
import { AUTH_EMAIL_LOCALIZATION as AUTH_EMAIL_LOCALIZATION_EN, type AuthEmailLocalization } from "./localization/auth-email-localization.en";

export type AuthEmailType = Exclude<keyof AuthEmailLocalization, "appName">;
export type AuthEmailCopy = AuthEmailLocalization[AuthEmailType];

const AUTH_EMAIL_HEADERS = {
    "Auto-Submitted": "auto-generated",
    "X-Auto-Response-Suppress": "All",
} as const;

const brand = {
    canvas: "#e8e8e8",
    card: "#f6f6f6",
    border: "#c2c2c2",
    text: "#242424",
    subtle: "#6c757d",
    accent: "#008080",
    accentText: "#ffffff",
    font: "'Segoe UI', 'Segoe UI Web (West European)', 'San Francisco Pro', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
} as const;

const APP_ICON_PATH = "/assets/favicon/favicon-96x96.png";

export async function sendAuthEmail(
    type: AuthEmailType,
    params: GenerateLinkParams,
    to: string,
    language: LanguageKey,
    req: { env: Env, origin: string }
) {
    const supabase = getSupabaseService(req.env);
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink(params);
    if (linkError)
        throw linkError;
    const actionLink = linkData.properties?.action_link;
    if (!actionLink)
        throw new BadRequestError("failed_to_generate_confirmation_link");
    const template = getAuthEmailTemplate(type, language, actionLink, undefined, req.env["APP_ORIGIN"]);
    await sendEmail(req.env, {
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: AUTH_EMAIL_HEADERS,
    });
}

export function getAuthEmailTemplate(type: AuthEmailType, language: LanguageKey, link: string, unitName?: string, appOrigin?: string) {
    const copy = getLocalization(language)[type];
    unitName ??= "";
    const appName = getAppName(language);
    const appIconUrl = appOrigin ? new URL(APP_ICON_PATH, appOrigin).toString() : "";
    return {
        subject: fillTemplate(copy.subject, { unitName }),
        text: [copy.body, link, copy.buttonNote, copy.footer].filter(Boolean).join("\n\n"),
        html: fillTemplate(AUTH_EMAIL_TEMPLATE_HTML, {
            language,
            brand,
            appName,
            appIconUrl,
            title: fillTemplate(copy.title, { unitName }),
            body: fillTemplate(copy.body, { unitName }),
            buttonLabel: fillTemplate(copy.buttonLabel, { unitName }),
            link: link,
            buttonNote: fillTemplate(copy.buttonNote, { unitName }),
            footer: copy.footer ? fillTemplate(copy.footer, { unitName }) : '',
        }),
    };
}

function getAppName(language: LanguageKey): string {
    switch (language) {
        case "de": return "Gemeinde Tools";
        case "en": return "Ward Tools";
    }
}

function getLocalization(language: LanguageKey): AuthEmailLocalization {
    switch (language) {
        case "de": return AUTH_EMAIL_LOCALIZATION_DE;
        case "en": return AUTH_EMAIL_LOCALIZATION_EN;
    }
}
