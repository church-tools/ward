import { SupabaseService } from "@/shared/service/supabase.service";
import { xeffect, xsignal } from "@/shared/utils/signal-utils";
import { Subscription } from "@/shared/utils/supa-sync/event-emitter";
import { inject, OnDestroy, Service } from "@angular/core";
import { Profile } from "./profile";

@Service()
export class ProfileService implements OnDestroy {

    private readonly supabase = inject(SupabaseService);

    private readonly _own = xsignal<Profile.Row | null>(null);
    readonly own = this._own.readonly;

    private ownSubscription?: Subscription;

    constructor() {
        xeffect([this.supabase.user], user => {
            this.ownSubscription?.unsubscribe();
            if (!user) return;
            this.ownSubscription = this.supabase.sync.from('profile')
                .findOne()
                .eq('email', user.email!)
                .subscribe(({ result: own }) => {
                    if (own) this._own.set(own);
                });
        });
    }

    ngOnDestroy() {
        this.ownSubscription?.unsubscribe();
    }
}