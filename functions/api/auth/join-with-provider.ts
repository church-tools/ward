import { BadRequestError, PermissionError, getSupabaseService, runFunction } from "../../shared/functions-utils";
import { checkUnitToken } from "./auth-utils";

export const onRequest = runFunction(async (req, params: { unitId: number; token: string }) => {
    const { unitId, token } = params;
    const supabase = getSupabaseService(req.env);

    if (!await checkUnitToken(supabase, unitId, token))
        return { error: "invitation_invalid_or_expired" };

    const { id: userId, email, email_confirmed_at, confirmed_at } = req.user;
    if (!email || !(email_confirmed_at || confirmed_at))
        throw new PermissionError("Email not verified");

    const { data: existingProfile } = await supabase
        .from("profile")
        .select("id, unit")
        .eq("user", userId)
        .maybeSingle()
        .throwOnError();

    if (existingProfile?.unit && existingProfile.unit !== unitId)
        return { error: "user_already_assigned_to_other_unit" };

    const profilePayload = {
        user: userId,
        email,
        unit: unitId,
        unit_approved: true,
    };

    const profile = existingProfile
        ? await supabase.from("profile").update(profilePayload).eq("id", existingProfile.id).select("id, unit, unit_approved").single().then(({ data, error }) => {
            if (error || !data)
                throw error ?? new BadRequestError("failed_to_join_unit");
            return data;
        })
        : await supabase.from("profile").insert(profilePayload).select("id, unit, unit_approved").single().then(({ data, error }) => {
            if (error || !data)
                throw error ?? new BadRequestError("failed_to_join_unit");
            return data;
        });

    const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
            ...req.user.app_metadata,
            unit: unitId,
            unit_approved: true,
        },
    });
    if (metadataError)
        throw metadataError;

    return {
        success: true,
        profile,
    };
});

export type JoinWithProviderFunction = typeof onRequest;