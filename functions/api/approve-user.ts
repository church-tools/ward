import { BadRequestError, getSupabaseService, runAuthenticatedFunction, UnauthorizedError } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ profile_id: number, approve: boolean }>(async req => {
    const { params: { profile_id, approve }, user, session } = req;
    if (!profile_id)
        throw new BadRequestError("profile_id is required");
    if (!session.unit)
        throw new UnauthorizedError("session.unit missing");

    const supabase = getSupabaseService(req.env);

    // Verify caller is an admin
    const { data: ownProfile, error: ownProfileError } = await supabase
        .from("profile")
        .select("is_admin")
        .eq("user", user.id)
        .single();
    if (ownProfileError || !ownProfile.is_admin)
        throw new UnauthorizedError("Not an admin");

    // Update the target profile's approval status
    await supabase
        .from("profile")
        .update({ unit_approved: approve })
        .eq("id", profile_id)
        .eq("unit", +session.unit)
        .single()
        .throwOnError();
});
