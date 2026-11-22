import { Chip } from '@/shared/widget/chip/chip';
import { Component, computed, input } from '@angular/core';
import type { Household } from './household';

/** What the chip shows: the household's own columns plus the first names of its members. */
export type HouseholdChipRow = Pick<Household.Row, 'name' | 'color_1' | 'color_2'> & {
    firstNames: readonly string[];
};

@Component({
    selector: 'app-household-chip',
    imports: [Chip],
    template: `
        <app-chip [background]="[household().color_1, household().color_2]">
            <span>{{ household().name }}</span>
            @if (firstNames()) {
                <span class="tiny-text opacity-75 overflow-ellipsis">{{ firstNames() }}</span>
            }
        </app-chip>
    `,
    host: { class: 'display-block' },
})
export class HouseholdChip {

    readonly household = input.required<HouseholdChipRow>();

    protected readonly firstNames = computed(() => this.household().firstNames.join(', '));
}
