
import type { LanguageKey } from "@/shared/language/language.service";
import { replacePlaceholders, sendEmail } from "@root/functions/shared/email-utils";
import { BadRequestError, type Env, getSupabaseService } from "@root/functions/shared/functions-utils";
import type { GenerateLinkParams } from "@supabase/supabase-js";
import AUTH_EMAIL_TEMPLATE_HTML from "./auth-email-template.html";
import { AUTH_EMAIL_LOCALIZATION as AUTH_EMAIL_LOCALIZATION_DE } from "./localization/auth-email-localization.de";
import { AUTH_EMAIL_LOCALIZATION as AUTH_EMAIL_LOCALIZATION_EN, type AuthEmailLocalization } from "./localization/auth-email-localization.en";

export type AuthEmailLanguage = "en" | "de";

export type AuthEmailType = keyof AuthEmailLocalization;
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
    const template = getAuthEmailTemplate(type, language, actionLink);
    await sendEmail(req.env, {
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: AUTH_EMAIL_HEADERS,
    });
}

export function getAuthEmailTemplate(type: AuthEmailType, language: LanguageKey, link: string, unitName?: string) {
    const copy = getLocalization(language)[type];
    unitName ??= "";

    return {
        subject: copy.subject,
        text: `${copy.intro}\n\n${copy.body}\n${link}\n\n${copy.footer}`,
        html: replacePlaceholders(AUTH_EMAIL_TEMPLATE_HTML, {
            language,
            brand,
            title: replacePlaceholders(copy.title, { unitName }),
            intro: replacePlaceholders(copy.intro, { unitName }),
            body: replacePlaceholders(copy.body, { unitName }),
            buttonLabel: replacePlaceholders(copy.buttonLabel, { unitName }),
            link: link,
            footer: replacePlaceholders(copy.footer, { unitName }),
        }),
    };
}

function getLocalization(language: LanguageKey): AuthEmailLocalization {
    switch (language) {
        case "de": return AUTH_EMAIL_LOCALIZATION_DE;
        case "en": return AUTH_EMAIL_LOCALIZATION_EN;
    }
}
