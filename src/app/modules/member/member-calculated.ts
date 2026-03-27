import type { Database } from "@root/database";
import type { CalculatedField, CalculatedValuesFromFields } from "@/shared/utils/supa-sync/supa-sync.types";

export const MemberCalculated = {
	
} satisfies Record<string, CalculatedField<Database, 'member'>>;

export type MemberCalculatedValues = CalculatedValuesFromFields<typeof MemberCalculated>;
