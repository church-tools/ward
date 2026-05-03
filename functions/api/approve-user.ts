import { getSupabaseService, runAdminFunction } from "../shared/functions-utils";

export const onRequest = runAdminFunction(async (req, params: {
    profile_id: number,
    approve: boolean
}) => {
    const { profile_id, approve } = params;
    const supabase = getSupabaseService(req.env);

    await supabase
        .from("profile")
        .update({ unit_approved: approve })
        .eq("id", profile_id)
        .eq("unit", req.session.unit)
        .single()
        .throwOnError();
});

export type ApproveUserFunction = typeof onRequest;
