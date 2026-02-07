import { getSupabaseService, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction(async req => {
    const { user } = req;

    // Check email confirmed
    if (!user.email || !(user.email_confirmed_at || user.confirmed_at))
        throw new PermissionError("Email not verified");

    // Query approved unit names
    const { data } = await getSupabaseService(req.env)
        .from("unit")
        .select("id, name")
        .eq("approved", true)
        .order("id", { ascending: true })
        .throwOnError();

    return { units: data };
});