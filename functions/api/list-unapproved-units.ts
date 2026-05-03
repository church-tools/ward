import { getSupabaseService, runAdminFunction } from "../shared/functions-utils";

export const onRequest = runAdminFunction(async req => {
    const supabase = getSupabaseService(req.env);
    const { data } = await supabase
        .from("unit")
        .select("id, name, created_by")
        .eq("approved", false)
        .order("id", { ascending: true })
        .throwOnError();

    return { units: data };
});

export type ListUnapprovedUnitsFunction = typeof onRequest;