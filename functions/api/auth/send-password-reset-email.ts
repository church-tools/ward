import type { LanguageKey } from "@/shared/language/language.service";
import { runCaptchaProtectedFunction } from "../../shared/functions-utils";
import { sendAuthEmail } from "./emails/auth-emails";

export const onRequest = runCaptchaProtectedFunction(async (req, params: {
    captchaToken: string;
    email: string;
    language: LanguageKey;
}) => {
    const { email, language } = params;
    await sendAuthEmail("reset", {
        type: "recovery", email, options: { redirectTo: `${req.origin}/reset-password`, }
    }, email, language, req);
});

export type SendPasswordResetEmailFunction = typeof onRequest;