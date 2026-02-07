import { BadRequestError, getSupabaseService, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ unit_id: number; approved: boolean }>(async req => {

    const { unit_id, approved } = req.params;
    if (!unit_id || typeof approved !== "boolean")
        throw new BadRequestError("unit_id and approved(boolean) required");
    if (!req.session.is_admin)
        throw new PermissionError();

    const supabase = getSupabaseService(req.env);
    await supabase
        .from("unit")
        .update({ approved })
        .eq("id", unit_id)
        .select()
        .throwOnError();
});
