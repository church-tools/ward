import { BadRequestError, getSupabaseService, PermissionError, runFunction } from "../shared/functions-utils";

export const onRequest = runFunction(async (req, params: { profile_id: number; set_admin: boolean }) => {
    const { profile_id, set_admin } = params;
    if (!profile_id)
        throw new BadRequestError("profile_id is required");

    const { user, session } = req;
    if (!session.unit)
        throw new BadRequestError("session.unit missing");

    const supabase = getSupabaseService(req.env);

    // Verify caller is an admin
    const { data: ownProfile } = await supabase
        .from("profile")
        .select("id, is_unit_admin")
        .eq("user", user.id)
        .single()
        .throwOnError();
    if (!ownProfile.is_unit_admin)
        throw new PermissionError("Not an admin");
    if (ownProfile.id == profile_id)
        throw new BadRequestError("Cannot change self");

    // Update target profile's admin status
    await supabase
        .from("profile")
        .update({ is_unit_admin: set_admin })
        .eq("id", profile_id)
        .eq("unit", +session.unit)
        .single()
        .throwOnError();
});

export type SetUserAdminFunction = typeof onRequest;