import { Service, signal } from "@angular/core";

@Service()
export class HouseholdService {

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
}
