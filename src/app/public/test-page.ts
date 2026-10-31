import { RichText } from '@/shared/form/rich-text/rich-text';
import { Page } from '@/shared/page/page';
import { Chip } from '@/shared/widget/chip/chip';
import { Component, computed, signal } from '@angular/core';
import { ColorName, PALETTE_COLORS, SEMANTIC_COLORS } from '../shared/utils/color-utils';

type ChipDemo = {
    value: string;
    view: string;
    color?: ColorName;
};

@Component({
    selector: 'app-test-page',
    template: `
        <span class="display-text">Test</span>
        <p>Dies ist eine Testseite</p>
        <h1>Überschrift 1</h1>
        <p>Dies ist ein body</p>
        <h2>Überschrift 2</h2>
        <p>Dies ist ein body</p>
        <h3>Überschrift 3</h3>
        <p>Dies ist ein body</p>
        <div class="card background p-5">Test Text</div>
        <div class="card red strong-text p-5">Strong Text with Color</div>
        <div class="column gap-2">
            @for (color of colorNames; track color) {
                <div class="row gap-2">
                    <div class="col p-3 round {{color}}-mute-bg"></div>
                    <div class="col p-3 round {{color}}-bg"></div>
                    <div class="col p-3 round {{color}}-active-bg"></div>
                    <div class="col p-3 round {{color}}-fg"></div>
                    <div class="col p-3 round {{color}}-high-contrast-bg"></div>
                    <div> hue: {{ $index * 15 }}  <span class="ms-3">{{ color }}</span></div>
                </div>
            }
        </div>

        <app-rich-text [value]="markdownContent()" (valueChange)="markdownContent.set($event ?? '')" name="test"/>
        <p>Markdown Inhalt:</p>
        <p class="text-pre-wrap">
            {{ markdownContent() }}
        </p>

        <div class="card background p-5 column gap-3">
            <span class="subtitle-text">Chips</span>

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

            <span class="subtle-text">Filled — one colour, or a [from, to] pair</span>
            <div class="row wrap gap-1 items-center">
                <app-chip background="teal">teal</app-chip>
                <app-chip background="palevioletred" removable>removable</app-chip>
                <app-chip background="green" clickable removable>clickable</app-chip>
                <app-chip [background]="['steelblue', 'mediumpurple']">steelblue → mediumpurple</app-chip>
                <app-chip [background]="['goldenrod', 'coral']" clickable removable>goldenrod → coral</app-chip>
            </div>

            <span class="subtle-text">Every colour — text, fill, and a gradient into its neighbour</span>
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
    imports: [RichText, Chip],
    host: { class: 'page narrow' },
})
export class Test extends Page {

    protected readonly markdownContent = signal('**Bold text** and _italic text_\n\n## Heading 2\n\n- List item 1\n- List item 2');

    protected readonly colorNames = PALETTE_COLORS;

    protected readonly chipColors: readonly ColorName[] = [...SEMANTIC_COLORS, ...PALETTE_COLORS];

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