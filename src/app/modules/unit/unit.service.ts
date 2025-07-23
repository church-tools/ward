import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/service/supabase.service";
import { Unit } from "./unit";

@Injectable({ providedIn: 'root' })
export class UnitService {

    private readonly supabaseService = inject(SupabaseService);

    private existingUnits: Pick<Unit.Row, 'id' | 'name'>[] | null = null;

    async getUnit() {
        const { data: units } = await this.supabaseService.client
            .from('unit')
            .select('*')
            .throwOnError();
        return units[0];
    }

    async getExistingUnits(): Promise<Pick<Unit.Row, 'id' | 'name'>[]> {
        if (this.existingUnits) return this.existingUnits;
        const { data: units } = await this.supabaseService.client
            .from('unit')
            .select('id, name')
            .throwOnError();
        this.existingUnits = units;
        return units;
    }
}