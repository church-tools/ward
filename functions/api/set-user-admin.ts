import { BadRequestError, getSupabaseService, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ profile_id: number; set_admin: boolean }>(async req => {
    const { profile_id, set_admin } = req.params;
    if (!profile_id)
        throw new BadRequestError("profile_id is required");

    const { user, session } = req;
    if (!session.unit)
        throw new BadRequestError("session.unit missing");

    const supabase = getSupabaseService(req.env);

    // Verify caller is an admin
    const { data: ownProfile } = await supabase
        .from("profile")
        .select("id, is_admin")
        .eq("user", user.id)
        .single()
        .throwOnError();
    if (!ownProfile.is_admin)
        throw new PermissionError("Not an admin");
    if (ownProfile.id == profile_id)
        throw new BadRequestError("Cannot change self");

    // Update target profile's admin status
    await supabase
        .from("profile")
        .update({ is_admin: set_admin })
        .eq("id", profile_id)
        .eq("unit", +session.unit)
        .single()
        .throwOnError();
});