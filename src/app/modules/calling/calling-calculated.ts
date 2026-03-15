import type { Database } from "../../../../database";
import type { CalculatedField, CalculatedValuesFromFields } from "../../shared/utils/supa-sync/supa-sync.types";
import type Table from "../shared/table.types";

export const CallingCalculated = {
	organization: {
		dependsOn: { organization: 'organization' } as const,
		calculation: (_, dependencies) => {
			const organization = dependencies.organization as Table.RemoteRow<'organization'> | undefined;
			if (!organization) return '';
			return `${organization.abbreviation ?? organization.name}\n${organization.color}`;
		},
	},
} satisfies Record<string, CalculatedField<Database, 'calling'>>;

export type CallingCalculatedValues = CalculatedValuesFromFields<typeof CallingCalculated>;
