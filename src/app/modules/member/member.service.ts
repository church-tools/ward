import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/service/supabase.service";
import { asyncComputed } from "../../shared/utils/signal-utils";
import { ProfileService } from "../profile/profile.service";

@Injectable({ providedIn: 'root' })
export class MemberService {

    private readonly profileService = inject(ProfileService);
    private readonly supabase = inject(SupabaseService);

    readonly self = asyncComputed([this.profileService.own], async own => own
        ? await this.supabase.sync
            .from('member')
            .findOne()
            .eq('profile', own.id)
            .get()
        : null
    );
}
