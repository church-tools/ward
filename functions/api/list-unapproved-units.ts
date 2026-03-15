import { getSupabaseService, PermissionError, runFunction } from "../shared/functions-utils";

export const onRequest = runFunction(async req => {
    if (!req.session.is_admin)
        throw new PermissionError("Forbidden");

    const supabase = getSupabaseService(req.env);
    const { data } = await supabase
        .from("unit")
        .select("id, name, created_by")
        .eq("approved", false)
        .order("id", { ascending: true })
        .throwOnError();

    return { units: data };
});
