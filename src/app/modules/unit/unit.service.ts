import { SupabaseService } from "@/shared/service/supabase.service";
import { xsignal } from "@/shared/utils/signal-utils";
import { inject, Injectable } from "@angular/core";
import { Unit } from "./unit";

@Injectable({ providedIn: 'root' })
export class UnitService {

    private readonly supabaseService = inject(SupabaseService);

    private readonly _own = xsignal<Unit.Row | null>(null);
    readonly own = this._own.readonly;

    constructor() {
        this.supabaseService.getSession().then(session => {
            if (!session?.unit) return;

            this.supabaseService.sync.from('unit')
                .findOne()
                .eq('id', +session.unit)
                .subscribe(({ result: own }) => {
                    if (own) this._own.set(own);
                });
        });
    }
}