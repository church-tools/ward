import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/service/supabase.service";
import { asyncComputed } from "../../shared/utils/signal-utils";
import { MemberService } from "../member/member.service";

@Injectable({ providedIn: 'root' })
export class MemberCallingService {

    private readonly memberService = inject(MemberService);
    private readonly supabase = inject(SupabaseService);

    readonly own = asyncComputed([this.memberService.self], async self => self
        ? await this.supabase.sync
            .from('member_calling')
            .find()
            .eq('member', self.id)
            .get()
        : [], []);
}
