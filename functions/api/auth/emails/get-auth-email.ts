import type { LanguageKey } from "@/shared/language/language.service";
import { runUnauthenticatedFunction } from "../../../shared/functions-utils";
import { getAuthEmailTemplate, type AuthEmailType } from "./auth-emails";

export const onRequest = runUnauthenticatedFunction(async (req, params: { type: AuthEmailType, language: LanguageKey, link: string, unitName?: string, appOrigin?: string }) => {
    let { type, language, link, unitName, appOrigin } = params;
    appOrigin ??= req.env["APP_ORIGIN"]
    return getAuthEmailTemplate(type, language, link, unitName, appOrigin);
});

export type GetAuthEmailFunction = typeof onRequest;