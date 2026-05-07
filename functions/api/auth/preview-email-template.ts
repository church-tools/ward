import type { LanguageKey } from "@/shared/language/language.service";
import type { Request as CFRequest } from "@cloudflare/workers-types";
import { BadRequestError, type Endpoint, type Env } from "../../shared/functions-utils";
import { getAuthEmailTemplate, type AuthEmailType } from "./emails/auth-emails";

const DEFAULT_PREVIEW = {
    type: "invite" as const,
    language: "en" as const,
    link: "https://example.com/auth/email-preview",
    unitName: "Ward Tools Preview Unit",
};

const HTML_HEADERS = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, max-age=0",
} as const;

const FALLBACK_APP_ORIGIN = "http://localhost:4201";

type PreviewEmailTemplateParams = {
    type?: AuthEmailType;
    language?: LanguageKey;
    link?: string;
    unitName?: string;
};

export const onRequest: Endpoint<PreviewEmailTemplateParams, string> = async context => {
    try {
        const url = new URL(context.request.url);
        const body = await readPreviewParams(context.request);
        const type = parseType(url.searchParams.get("type") ?? body.type ?? null);
        const language = parseLanguage(url.searchParams.get("language") ?? body.language ?? null);
        const link = url.searchParams.get("link") ?? body.link ?? DEFAULT_PREVIEW.link;
        const unitName = url.searchParams.get("unitName") ?? body.unitName ?? DEFAULT_PREVIEW.unitName;
        const appOrigin = (context.env as Env)["APP_ORIGIN"] ?? FALLBACK_APP_ORIGIN;

        const template = getAuthEmailTemplate(type, language, link, unitName, appOrigin);
        return new Response(template.html, {
            status: 200,
            headers: HTML_HEADERS,
        });
    } catch (error) {
        if (error instanceof BadRequestError) {
            return new Response(error.message, {
                status: error.status,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store, max-age=0",
                },
            });
        }

        throw error;
    }
};

export type PreviewEmailTemplateFunction = typeof onRequest;

async function readPreviewParams(request: CFRequest): Promise<PreviewEmailTemplateParams> {
    if (request.method !== "POST")
        return {};
    return await request.json().catch(() => ({})) as PreviewEmailTemplateParams;
}

function parseType(value: string | null): AuthEmailType {
    const normalized = value?.trim().toLowerCase();
    switch (normalized) {
        case null:
        case "":
            return DEFAULT_PREVIEW.type;
        case "confirm":
        case "reset":
        case "invite":
            return normalized;
        default:
            throw new BadRequestError("invalid_email_type");
    }
}

function parseLanguage(value: string | null): LanguageKey {
    const normalized = value?.trim().toLowerCase();
    switch (normalized) {
        case null:
        case "":
            return DEFAULT_PREVIEW.language;
        case "en":
        case "de":
            return normalized;
        default:
            throw new BadRequestError("invalid_language");
    }
}
