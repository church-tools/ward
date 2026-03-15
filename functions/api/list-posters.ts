import { BadRequestError, getSupabaseService, runUnauthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runUnauthenticatedFunction<{ key: string }>(async req => {
    const { key } = req.params;
    if (!key) throw new BadRequestError("key required");

    // Fetch posters and their unit in a single query, scoped by bulletin board key.
    const { data } = await getSupabaseService(req.env)
        .from("poster")
        .select("id, files, organization(name, abbreviation), unit:unit!inner(id, name)")
        .eq("unit.bulletin_board_key", key.toLowerCase())
        .eq("unit.approved", true)
        .throwOnError();

    return { posters: data };
});