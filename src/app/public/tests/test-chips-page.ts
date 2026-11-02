import LinkButton from '@/shared/form/button/link/link-button';
import { Page } from '@/shared/page/page';
import { Chip } from '@/shared/widget/chip/chip';
import { Component, computed, signal } from '@angular/core';
import { ColorName, PALETTE_COLORS, SEMANTIC_COLORS } from '@/shared/utils/color-utils';

type ChipDemo = {
    value: string;
    view: string;
    color?: ColorName;
};

@Component({
    selector: 'app-test-chips-page',
    template: `
        <app-link-button icon="arrow_left" type="subtle" size="small" hideNewTab
            href="/test">Test pages</app-link-button>
        <span class="display-text">Chips</span>
        <p>Dies ist eine Testseite</p>

        <div class="card background p-5 column gap-3">
            <span class="subtle-text">Selected values — removable, and clickable while still available</span>
            <div class="row wrap gap-1">
                @for (option of selectedChips(); track option.value) {
                    <app-chip [color]="option.color" removable
                        (removeClick)="deselect(option.value)">
                        {{ option.view }}
                    </app-chip>
                } @empty {
                    <span class="subtle-text">nothing selected — click one below</span>
                }
            </div>

            <span class="subtle-text">Available — click to select</span>
            <div class="row wrap gap-1">
                @for (option of availableChips(); track option.value) {
                    <app-chip [color]="option.color" clickable
                        (click)="select(option.value)">
                        {{ option.view }}
                    </app-chip>
                } @empty {
                    <span class="subtle-text">everything is selected</span>
                }
            </div>

            <span class="subtle-text">States — inert (neither clickable nor removable), clickable, removable, clickable + removable</span>
            <div class="row wrap gap-1 items-center">
                <app-chip>Inert</app-chip>
                <app-chip color="teal" clickable>Clickable</app-chip>
                <app-chip color="green" removable>Removable</app-chip>
                <app-chip color="danger" clickable removable>Both</app-chip>
            </div>

            <span class="subtle-text">Filled — one solid colour, or a pair of theme colours</span>
            <div class="row wrap gap-1 items-center">
                <app-chip background="teal">teal</app-chip>
                <app-chip background="palevioletred" removable>removable</app-chip>
                <app-chip background="green" clickable removable>clickable</app-chip>
                <app-chip [background]="['steelblue', 'mediumpurple']">steelblue → mediumpurple</app-chip>
                <app-chip [background]="['goldenrod', 'coral']" clickable removable>goldenrod → coral</app-chip>
            </div>

            <span class="subtle-text">Every colour — text, solid fill, and a duo with its neighbour</span>
            <div class="column gap-1">
                @for (pair of colorPairs; track pair.color) {
                    <div class="row wrap gap-1 items-center">
                        <app-chip [color]="pair.color" removable>{{ pair.color }}</app-chip>
                        <app-chip [background]="pair.color" removable>fill</app-chip>
                        <app-chip [background]="[pair.color, pair.next]" clickable removable>→ {{ pair.next }}</app-chip>
                    </div>
                }
            </div>
        </div>
    `,
    imports: [Chip, LinkButton],
    host: { class: 'page narrow' },
})
export class TestChipsPage extends Page {

    private readonly chipColors: readonly ColorName[] = [...SEMANTIC_COLORS, ...PALETTE_COLORS];

    protected readonly colorPairs = this.chipColors.map((color, index) => ({
        color,
        next: this.chipColors[(index + 1) % this.chipColors.length],
    }));

    private readonly chipOptions: readonly ChipDemo[] = [
        { value: 'brother', view: 'Bro. Miller', color: 'steelblue' },
        { value: 'sister', view: 'Sis. Tanner', color: 'palevioletred' },
        { value: 'household', view: 'Tanner household', color: 'teal' },
        { value: 'district', view: 'District 4', color: 'mediumpurple' },
        { value: 'unassigned', view: 'Unassigned', color: 'coral' },
        { value: 'long', view: 'A deliberately very long value that has nowhere to go in a narrow column', color: 'goldenrod' },
    ];

    protected readonly selected = signal<readonly string[]>(['brother', 'household']);

    protected readonly selectedChips = computed(() =>
        this.chipOptions.filter(o => this.selected().includes(o.value)));

    protected readonly availableChips = computed(() =>
        this.chipOptions.filter(o => !this.selected().includes(o.value)));

    protected select(value: string) {
        this.selected.update(selected => [...selected, value]);
    }

    protected deselect(value: string) {
        this.selected.update(selected => selected.filter(item => item !== value));
    }
}
