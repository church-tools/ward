import { getSupabaseService, runUnitAdminFunction } from "../shared/functions-utils";
import { updateUserUnitClaims } from "../shared/auth-claims";

export const onRequest = runUnitAdminFunction(async (req, params: {
    profile_id: number,
    approve: boolean
}) => {
    const { profile_id, approve } = params;
    const supabase = getSupabaseService(req.env);

    const { data: profile, error } = await supabase
        .from("profile")
        .update({ unit_approved: approve })
        .eq("id", profile_id)
        .eq("unit", req.session.unit)
        .select("user, unit_approved")
        .single();
    if (error || !profile)
        throw error ?? new Error("failed_to_update_profile");

    await updateUserUnitClaims(supabase, profile.user, req.session.unit, profile.unit_approved);
});

export type ApproveUserFunction = typeof onRequest;
