import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/service/supabase.service";
import { asyncComputed } from "../../shared/utils/signal-utils";
import { MemberCallingService } from "../member_calling/member-calling.service";

@Injectable({ providedIn: 'root' })
export class CallingService {

    private readonly memberCallingService = inject(MemberCallingService);
    private readonly supabase = inject(SupabaseService);

    readonly own = asyncComputed([this.memberCallingService.own], async own => own
        ? await this.supabase.sync
            .from('calling')
            .find()
            .in('id', own.map(mc => mc.calling))
            .get()
        : [], []);
}
