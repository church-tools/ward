import { SupabaseService } from "@/shared/service/supabase.service";
import { asyncComputed } from "@/shared/utils/signal-utils";
import { inject, Service } from "@angular/core";
import { ProfileService } from "../profile/profile.service";

@Service()
export class MemberService {

    private readonly profileService = inject(ProfileService);
    private readonly supabase = inject(SupabaseService);

    readonly self = asyncComputed([this.profileService.own], async own => own?.member
        ? await this.supabase.sync
            .from('member')
            .read(own.member)
            .get()
        : null
    );
}
