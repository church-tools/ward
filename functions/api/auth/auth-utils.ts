import type { Database } from "@root/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { BadRequestError } from "../../shared/functions-utils";

export function createInviteToken() {
    return crypto.randomUUID().replace(/-/g, "");
}

export async function createUser(
    supabase: SupabaseClient<Database>,
    email: string, password: string,
    unit?: { id: number, token: string },
) {
    if (unit && !await checkUnitToken(supabase, unit.id, unit.token))
        throw new BadRequestError("Invalid unit join token");
    const { data: createdUserData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
    });
    let user = createdUserData.user as { id: string, existing?: boolean } | null;
    if (createError) {
        if ((createError.message || "").toLowerCase().includes("already")) {
            if (unit) {
                const { data: existingUser } = await supabase.rpc("get_user_id_by_email", { email }).single();
                if (!existingUser)
                    throw new BadRequestError("user_already_exists");
                console.log("User already exists, updating unit association");
                user = { id: existingUser.id, existing: true };
            } else {
                throw new BadRequestError("user_already_exists");
            }
        } else {
            throw createError;
        }
    }
    if (!user)
        throw new BadRequestError("failed_to_create_user");
    if (unit) {
        await supabase.from("profile")
            .upsert({ unit: unit.id, user: user.id, email }, { onConflict: "user" })
    }
    return user;
}

export async function checkUnitToken(supabase: SupabaseClient<Database>, unitId: number, token: string) {
    const { data: unit } = await supabase
        .from("unit")
        .select("id, name, join_token, join_timeout")
        .eq("id", unitId)
        .maybeSingle()
        .throwOnError();
    if (!unit || unit.join_token !== token || !unit.join_token || !unit.join_timeout)
        return null;
    if (unit.join_timeout < new Date().toISOString().split("T")[0]) {
        await supabase.from("unit")
            .update({ join_token: null, join_timeout: null })
            .eq("id", unit.id)
            .throwOnError();
        return null;
    }
    return unit;
}
