import { SupabaseService } from "@/shared/service/supabase.service";
import { asyncComputed } from "@/shared/utils/signal-utils";
import { inject, Injectable } from "@angular/core";
import { MemberCallingService } from "../member-calling/member-calling.service";
import type { Insert, Row, Table, TableQuery } from "../shared/table.types";
import { UnitService } from "../unit/unit.service";

@Injectable({ providedIn: 'root' })
export class CallingService {

    private readonly unitService = inject(UnitService);
    private readonly memberCallingService = inject(MemberCallingService);
    private readonly supabase = inject(SupabaseService);

    readonly own = asyncComputed([this.memberCallingService.own], async own => own
        ? await this.supabase.sync
            .from('calling')
            .find()
            .in('id', own.map(mc => mc.calling))
            .get()
        : [], []);
    
	readonly getMemberQuery = (
		table: Table<'member'>,
		calling: Row<'calling'>,
	): TableQuery<'member', Row<'member'>[]> => calling.gender_restriction
		? table.find().eq('gender', calling.gender_restriction)
		: table.readAll();

	readonly mapMemberCallingInsert = (callingId: number, memberId: number): Insert<'member_calling'> => ({
		calling: callingId,
		member: memberId,
		state: 'set_apart',
		unit: this.unitService.own()!.id,
	});
}
