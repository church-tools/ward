import type { LanguageKey } from "@/shared/language/language.service";
import { getSupabaseService, runCaptchaProtectedFunction } from "../../shared/functions-utils";
import { createUser } from "./auth-utils";
import { sendAuthEmail } from "./emails/auth-emails";

export const onRequest = runCaptchaProtectedFunction(async (req, params: {
    captchaToken: string,
    email: string,
    password: string,
    language: LanguageKey,
    unit?: { id: number, token: string },
}) => {
    const { email, password, language, unit } = params;
    const supabase = getSupabaseService(req.env);
    const user = await createUser(supabase, email, password, unit);
    await sendAuthEmail("confirm", user.existing
        ? { type: "recovery", email, options: { redirectTo: `${req.origin}/reset-password`, } }
        : { type: "signup", email, password, options: { redirectTo: `${req.origin}/` } },
        email, language, req);
});

export type RegisterWithPasswordFunction = typeof onRequest;