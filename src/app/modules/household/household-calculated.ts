import type { Database } from "@root/database";
import type { CalculatedField, CalculatedValuesFromFields } from "@/shared/utils/supa-sync/supa-sync.types";

export const HouseholdCalculated = {

} satisfies Record<string, CalculatedField<Database, 'household'>>;

export type HouseholdCalculatedValues = CalculatedValuesFromFields<typeof HouseholdCalculated>;
