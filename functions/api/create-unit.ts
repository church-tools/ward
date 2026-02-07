import { getSupabaseService, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ name: string }>(async req => {

    const { user, params: { name } } = req;

    const supabase = getSupabaseService(req.env);

    // Check unit creation limit
    const { count: unitCount } = await supabase
        .from("unit")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .throwOnError();
    if (unitCount! >= 3)
        throw new PermissionError("Limit of 3 units reached");

    // Create unit
    const { data: unit } = await supabase
        .from("unit")
        .insert({ name, created_by: user.id })
        .select("id")
        .single()
        .throwOnError();

    // Assign user to the new unit
    await supabase
        .from("profile")
        .update({ unit: unit!.id })
        .eq("user", user.id)
        .throwOnError();
});
