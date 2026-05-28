import type { LanguageKey } from "@/shared/language/language.service";
import { getSupabaseService, runCaptchaProtectedFunction } from "../../shared/functions-utils";
import { updateUserUnitClaims } from "../../shared/auth-claims";
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
    if (unit) {
        const { data: unitRow, error: unitError } = await supabase
            .from("unit")
            .select("join_requires_approval")
            .eq("id", unit.id)
            .single();
        if (unitError || !unitRow)
            throw unitError ?? new Error("failed_to_load_unit");
        if (unitRow.join_requires_approval === false) {
            await supabase
                .from("profile")
                .update({ unit_approved: true })
                .eq("user", user.id)
                .eq("unit", unit.id)
                .is("unit_approved", null)
                .throwOnError();
        }
        const { data: profile, error: profileError } = await supabase
            .from("profile")
            .select("unit_approved")
            .eq("user", user.id)
            .eq("unit", unit.id)
            .single();
        if (profileError || !profile)
            throw profileError ?? new Error("failed_to_load_profile");
        const nextUnitApproved = profile.unit_approved === true
            ? true
            : profile.unit_approved === false
                ? false
                : unitRow.join_requires_approval === false
                    ? true
                    : null;
        await updateUserUnitClaims(supabase, user.id, unit.id, nextUnitApproved);
    }
    await sendAuthEmail("confirm", user.existing
        ? { type: "recovery", email, options: { redirectTo: `${req.origin}/reset-password`, } }
        : { type: "signup", email, password, options: { redirectTo: `${req.origin}/` } },
        email, language, req);
});

export type RegisterWithPasswordFunction = typeof onRequest;