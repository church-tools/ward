import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/service/supabase.service";
import { asyncComputed } from "../../shared/utils/signal-utils";
import { CallingService } from "../calling/calling.service";

@Injectable({ providedIn: 'root' })
export class OrganizationService {

    private readonly callingService = inject(CallingService);
    private readonly supabase = inject(SupabaseService);

    readonly own = asyncComputed([this.callingService.own], async ownCallings => ownCallings?.length
        ? await this.supabase.sync
            .from('organization')
            .find()
            .in('id', [...new Set(ownCallings.map(mc => mc.organization).filter(Boolean))] as number[])
            .get()
        : [], []);
}
