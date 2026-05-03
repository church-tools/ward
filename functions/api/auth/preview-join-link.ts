import { getSupabaseService, runUnauthenticatedFunction } from "../../shared/functions-utils";
import { checkUnitToken } from "./auth-utils";

export const onRequest = runUnauthenticatedFunction(async (req, params: {
    unitId: number,
    token: string,
}) => {
    const { unitId, token } = params;
    const supabase = getSupabaseService(req.env);
    const unit = await checkUnitToken(supabase, unitId, token);
    return unit
        ? { unit } as const
        : { error: "invitation_invalid_or_expired" } as const;
});

export type PreviewJoinLinkFunction = typeof onRequest;