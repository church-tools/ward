import { getSupabaseService, runUnitAdminFunction } from "../../shared/functions-utils";
import { createInviteToken } from "./auth-utils";

export const onRequest = runUnitAdminFunction(async (req, params: { validity_days: number }) => {
    const { session, env } = req;
    const { validity_days } = params;

    const token = createInviteToken();
    const supabase = getSupabaseService(env);
    await supabase
        .from("unit")
        .update({
            join_token: token,
            join_timeout: new Date(Date.now() + Number(validity_days) * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", session.unit)
        .single()
        .throwOnError();
});

export type GenerateJoinLinkFunction = typeof onRequest;