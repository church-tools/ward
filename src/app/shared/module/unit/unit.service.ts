import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../supabase.service";

@Injectable({ providedIn: 'root' })
export class UnitService {

    private readonly supabaseService = inject(SupabaseService);

    async getUnit() {
        const { data: units } = await this.supabaseService.client
            .from('unit')
            .select('*')
            .throwOnError();
        return units[0];
    }
}