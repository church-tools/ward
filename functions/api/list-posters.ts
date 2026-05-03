import {
    signFileAccessUrl
} from "../shared/file-signing-utils";
import { BadRequestError, getSupabaseService, runUnauthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runUnauthenticatedFunction(async (req, params: { key: string }) => {
    const { key } = params;
    if (!key) throw new BadRequestError("key required");

    // Fetch posters and their unit in a single query, scoped by bulletin board key.
    const { data } = await getSupabaseService(req.env)
        .from("poster")
        .select("id, files, organization(name, abbreviation), unit:unit!inner(id, name)")
        .eq("unit.bulletin_board_key", key.toLowerCase())
        .eq("unit.approved", true)
        .throwOnError();

    const posters = await Promise.all((data ?? []).map(async poster => ({
        ...poster,
        files: await Promise.all(poster.files.map(key => signFileAccessUrl(req.env, poster.unit.id, key, "GET"))),
    })));

    return { posters };
});

export type ListPostersFunction = typeof onRequest;