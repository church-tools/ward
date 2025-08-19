import { inject, Injectable, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { SupabaseService } from "../../shared/service/supabase.service";
import { xeffect, xsignal } from "../../shared/utils/signal-utils";
import { Profile } from "./profile";

@Injectable({ providedIn: 'root' })
export class ProfileService implements OnDestroy {

    private readonly supabase = inject(SupabaseService);

    readonly own = xsignal<Profile.Row>();

    private ownSubscription?: Subscription;

    constructor() {
        xeffect([this.supabase.user], user => {
            this.ownSubscription?.unsubscribe();
            if (!user) return;
            this.ownSubscription = this.supabase.sync.from('profile')
                .findOne()
                .eq('uid', user.id)
                .subscribe(({ result: own }) => {
                    if (own) this.own.set(own);
                });
        });
    }

    ngOnDestroy() {
        this.ownSubscription?.unsubscribe();
    }
}