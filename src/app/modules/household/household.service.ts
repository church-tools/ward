import { SupabaseService } from "@/shared/service/supabase.service";
import { inject, Service, signal } from "@angular/core";
import type { Household } from "./household";

@Service()
export class HouseholdService {

    private readonly supabase = inject(SupabaseService);

    private readonly _expandedIds = signal<ReadonlySet<number>>(new Set<number>());

    isExpanded(id: number): boolean {
        return this._expandedIds().has(id);
    }

    setExpanded(id: number, expanded: boolean) {
        const current = this._expandedIds();
        if (current.has(id) === expanded)
            return;
        const next = new Set(current);
        if (expanded)
            next.add(id);
        else
            next.delete(id);
        this._expandedIds.set(next);
    }

    nameKey(name: string): string {
        return name.trim().replace(/\s+/g, ' ').toLowerCase();
    }

    singletonName(member: { first_name: string; last_name?: string | null }): string {
        return `${member.last_name ?? ''}, ${member.first_name}`.replace(/^,\s*/, '');
    }

    async readAll(): Promise<Household.Row[]> {
        return await this.supabase.sync.from('household').readAll().get();
    }

    async byNameKey(unit: number): Promise<Map<string, Household.Row>> {
        const households = await this.supabase.sync.from('household').find().eq('unit', unit).get();
        return new Map(households.map(household => [this.nameKey(household.name), household]));
    }

    async findOrCreate(unit: number, name: string, existing?: Map<string, Household.Row>): Promise<Household.Row> {
        const key = this.nameKey(name);
        const households = existing ?? await this.byNameKey(unit);
        const found = households.get(key);
        if (found)
            return found;
        const created = await this.create(unit, name.trim());
        households.set(key, created);
        return created;
    }

    async findOrCreateMany(unit: number, names: readonly string[]): Promise<Map<string, Household.Row>> {
        const households = await this.byNameKey(unit);
        const missing = new Map<string, string>();
        for (const name of names) {
            const trimmed = name.trim();
            const key = this.nameKey(trimmed);
            if (trimmed && !households.has(key) && !missing.has(key))
                missing.set(key, trimmed);
        }
        if (!missing.size)
            return households;
        const created = await this.supabase.sync.from('household').insert(
            [...missing.values()].map(name => ({ name, unit, deleted: false })));
        for (const household of created)
            households.set(this.nameKey(household.name), household);
        return households;
    }

    async create(unit: number, name: string): Promise<Household.Row> {
        return await this.supabase.sync.from('household').insert({
            name: name.trim(),
            unit,
            deleted: false,
        });
    }
}
