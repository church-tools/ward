import type { Database } from "../../../../database";
import type { CalculatedField, CalculatedValuesFromFields } from "../../shared/utils/supa-sync/supa-sync.types";
import type Table from "../shared/table.types";

export const MemberCallingCalculated = {
	memberName: {
		dependsOn: { member: 'member' } as const,
		calculation: (_, dependencies) => {
			const member = dependencies.member as Table.Row<'member'> | undefined;
			if (!member) return '';
			return `${member.nick_name || member.first_name} ${member.last_name ?? ''}`.trim();
		},
	},
	calling: {
		dependsOn: { calling: 'calling' } as const,
		calculation: (_, dependencies) => {
			const calling = dependencies.calling as Table.Row<'calling'> | undefined;
			return calling ? { name: calling.name ?? '', organization: calling._calculated.organization } : null;
		},
	},
} satisfies Record<string, CalculatedField<Database, 'member_calling'>>;

export type MemberCallingCalculatedValues = CalculatedValuesFromFields<typeof MemberCallingCalculated>;
