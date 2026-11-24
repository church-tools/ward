import type { Database } from "@root/database";
import type { CalculatedField, CalculatedValuesFromFields } from "@/shared/utils/supa-sync/supa-sync.types";

export const HouseholdCalculated = {
	firstNames: {
		dependsOnReverse: { member: 'household' } as const,
		version: 1,
		calculation: (_, dependencies) => (dependencies.member ?? []).map(member => member.nick_name || member.first_name),
	},
} satisfies Record<string, CalculatedField<Database, 'household'>>;

export type HouseholdCalculatedValues = CalculatedValuesFromFields<typeof HouseholdCalculated>;
