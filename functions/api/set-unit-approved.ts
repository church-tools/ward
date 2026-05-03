import { BadRequestError, getSupabaseService, runAdminFunction } from "../shared/functions-utils";

export const onRequest = runAdminFunction(async (req, params: { unit_id: number; approved: boolean }) => {

    const { unit_id, approved } = params;
    if (!unit_id || typeof approved !== "boolean")
        throw new BadRequestError("unit_id and approved(boolean) required");

    const supabase = getSupabaseService(req.env);
    await supabase
        .from("unit")
        .update({ approved })
        .eq("id", unit_id)
        .select()
        .throwOnError();
});

export type SetUnitApprovedFunction = typeof onRequest;