import { BadRequestError, getSupabaseService, NotFoundError, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ unit_id: number }>(async req => {

    const { params: { unit_id }, user } = req;
    if (!unit_id)
        throw new BadRequestError("unit_id is required");

    const { id: uid, email, email_confirmed_at, confirmed_at } = user;

    // Check email confirmed
    if (!email || !(email_confirmed_at || confirmed_at))
        throw new PermissionError("Email not verified");

    const supabase = getSupabaseService(req.env);

    // Insert profile
    const { data, error } = await supabase
        .from("profile")
        .insert({ user: uid, email, unit: unit_id })
        .select()
        .single();
    
    if (error) {
        if (error.details && error.details.includes("already exists")) {
            const { data: existing } = await supabase
                .from("profile")
                .select()
                .eq("user", uid)
                .single();
            return { profile: existing };
        }
        throw new NotFoundError("Failed to join unit");
    }

    return { profile: data };
});
    
