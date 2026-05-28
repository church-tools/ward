import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@root/database";

type AppMetadata = Record<string, unknown>;

export async function updateUserUnitClaims(
    supabase: SupabaseClient<Database>,
    userId: string,
    unitId: number | null,
    unitApproved: boolean | null,
    existingAppMetadata?: AppMetadata,
) {
    let appMetadata = existingAppMetadata;
    if (!appMetadata) {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
        if (error)
            throw error;
        appMetadata = (userData.user?.app_metadata ?? {}) as AppMetadata;
    }

    const nextMetadata: AppMetadata = {
        ...appMetadata,
        unit: unitApproved === true ? unitId : null,
        unit_approved: unitApproved,
    };

    const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: nextMetadata,
    });
    if (metadataError)
        throw metadataError;
}
