import type { Database } from "../../../../database";
import type { CalculatedField, CalculatedValuesFromFields } from "../../shared/utils/supa-sync/supa-sync.types";
import type Table from "../shared/table.types";

export const MemberCallingCalculated = {
	memberName: {
		dependsOn: { member: 'member' } as const,
		calculation: (_, dependencies) => {
			const member = dependencies.member as Table.RawRow<'member'> | undefined;
			if (!member) return '';
			return `${member.nick_name || member.first_name} ${member.last_name ?? ''}`.trim();
		},
	},
	callingName: {
		dependsOn: { calling: 'calling' } as const,
		calculation: (_, dependencies) => {
			const calling = dependencies.calling as Table.RawRow<'calling'> | undefined;
			return calling?.name ?? '';
		},
	},
} satisfies Record<string, CalculatedField<Database, 'member_calling'>>;

export type MemberCallingCalculatedValues = CalculatedValuesFromFields<typeof MemberCallingCalculated>;