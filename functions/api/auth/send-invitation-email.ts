import type { LanguageKey } from "@/shared/language/language.service";
import { BadRequestError, getSupabaseService, runAdminFunction } from "../../shared/functions-utils";
import { createUser } from "./auth-utils";
import { sendAuthEmail } from "./emails/auth-emails";

export const onRequest = runAdminFunction(async (req, params: { email: string, language: LanguageKey }) => {
    const { session, env, origin } = req;
    const { email, language } = params;

    const supabase = getSupabaseService(env);
    const { data: unit, error: unitError } = await supabase
        .from("unit")
        .select("id, name")
        .eq("id", session.unit)
        .single();

    if (unitError || !unit)
        throw new BadRequestError("failed_to_prepare_invitation");

    const user = await createUser(supabase, email, crypto.randomUUID().replace(/-/g, ""));

    const { data: existingProfile } = await supabase
        .from("profile")
        .select("id, unit")
        .eq("user", user.id)
        .maybeSingle();

    if (existingProfile?.unit && existingProfile.unit !== unit.id)
        throw new BadRequestError("user_already_assigned_to_other_unit");

    if (!existingProfile) {
        const { error: createProfileError } = await supabase
            .from("profile")
            .insert({ user: user.id, email, unit: unit.id });

        if (createProfileError)
            throw createProfileError;
    }

    await sendAuthEmail(user.existing ? "reset" : "invite", {
        type: "recovery",
        email,
        options: { redirectTo: `${origin}/reset-password` },
    }, email, language, req);
});

export type SendInvitationEmailFunction = typeof onRequest;