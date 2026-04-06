import type { Database } from "@root/database";
import type { CalculatedField, CalculatedValuesFromFields } from "@/shared/utils/supa-sync/supa-sync.types";
import type Table from "../../../shared/table.types";

export const MessageCalculated = {
	memberName: {
		dependsOn: { speaker: 'member' } as const,
		version: 1,
		calculation: (row, dependencies) => {
			const member = dependencies['speaker'] as Table.Row<'member'> | undefined;
			return member
				? `${member.nick_name || member.first_name} ${member.last_name ?? ''}`.trim()
				: row.speaker?.trim() ?? '';
		},
	},
} satisfies Record<string, CalculatedField<Database, 'message'>>;

export type MessageCalculatedValues = CalculatedValuesFromFields<typeof MessageCalculated>;
