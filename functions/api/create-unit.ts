import { createReadableCode } from "@/shared/utils/string-utils";
import { getSupabaseService, PermissionError, runFunction } from "../shared/functions-utils";

export const onRequest = runFunction(async (req, params: { name: string }) => {
    const { user } = req;
    const { name } = params;
    const supabase = getSupabaseService(req.env);

    // Check unit creation limit
    const { count: unitCount } = await supabase
        .from("unit")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .throwOnError();
    if (unitCount! >= 3)
        throw new PermissionError("Limit of 3 units reached");

    // create 6 digit string with 0-9 and a-z characters
    let bulletin_board_key = createReadableCode(6);
    
    // Create unit
    const { data: unit } = await supabase
        .from("unit")
        .insert({ name, created_by: user.id, bulletin_board_key })
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

export type CreateUnitFunction = typeof onRequest;