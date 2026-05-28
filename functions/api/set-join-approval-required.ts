import { BadRequestError, getSupabaseService, runUnitAdminFunction } from "../shared/functions-utils";
import { updateUserUnitClaims } from "../shared/auth-claims";

export const onRequest = runUnitAdminFunction(async (req, params: { required: boolean }) => {
    const { required } = params;
    if (typeof required !== "boolean")
        throw new BadRequestError("required(boolean) required");

    const supabase = getSupabaseService(req.env);
    const unitId = req.session.unit;

    await supabase
        .from("unit")
        .update({ join_requires_approval: required })
        .eq("id", unitId)
        .throwOnError();

    if (!required) {
        const { data: pendingProfiles, error: pendingError } = await supabase
            .from("profile")
            .select("user")
            .eq("unit", unitId)
            .is("unit_approved", null);
        if (pendingError)
            throw pendingError;

        await supabase
            .from("profile")
            .update({ unit_approved: true })
            .eq("unit", unitId)
            .is("unit_approved", null)
            .throwOnError();

        for (const pending of pendingProfiles ?? []) {
            await updateUserUnitClaims(supabase, pending.user, unitId, true);
        }
    }
});

export type SetJoinApprovalRequiredFunction = typeof onRequest;
