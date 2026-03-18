import type { Database } from "../../../../database";
import type { CalculatedField, CalculatedValuesFromFields } from "../../shared/utils/supa-sync/supa-sync.types";
import type Table from "../shared/table.types";

export const CallingCalculated = {
	organization: {
		dependsOn: { organization: 'organization' } as const,
		version: 1,
		calculation: (_, dependencies) => {
			const organization = dependencies.organization as Table.Row<'organization'> | undefined;
			return organization ? { name: organization.abbreviation || organization.name, color: organization.color } : null;
		},
	},
} satisfies Record<string, CalculatedField<Database, 'calling'>>;

export type CallingCalculatedValues = CalculatedValuesFromFields<typeof CallingCalculated>;
