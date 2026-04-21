import { HymnNumber } from '@/modules/sacrament-meeting/item/hymn/hymn-numbers';
import { HymnOptionRow, HymnTitleService } from '@/modules/sacrament-meeting/item/hymn/hymn-title.service';
import { HymnViewService } from '@/modules/sacrament-meeting/item/hymn/hymn-view.service';
import type { Column } from '@/modules/shared/table.types';
import Checkbox from '@/shared/form/checkbox/checkbox';
import { Select } from '@/shared/form/select/select';
import InputLabel from '@/shared/form/shared/input-label';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { asyncComputed, xcomputed, xsignal } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RowPage } from '../../../shared/row-page';
import { wait } from '@/shared/utils/flow-control-utils';

type FixedHymnSlot = ('opening_hymn' | 'sacrament_hymn' | 'closing_hymn') & Column<'sacrament_meeting'>;

@Component({
    selector: 'app-fixed-hymn-page',
    template: `

        <h4 class="mb--4">{{ label() | localize }} @if (hymnNumber(); as number) { #{{ number }} }</h4>
        <h3>{{ titleText() }}</h3>
        <div class="column-grid">
            <app-select [syncedRow]="syncedRow" [column]="slot()"
                class="col-12"
                [options]="hymnOptions()"
                [hideClear]="false"
                label="{{ 'HYMN_PAGE.TITLE' | localize }}">
                <ng-template #optionsHeaderTemplate>
                    <app-checkbox
                        [value]="showTopicsInSuggestions()"
                        [label]="'HYMN_PAGE.SHOW_TOPICS' | localize"
                        (valueChange)="showTopicsInSuggestions.set($event ?? false)">
                    </app-checkbox>
                </ng-template>
                <ng-template #valueTemplate let-option>
                    @let row = $any(option.row);
                    @if (row) {
                        <span class="wrap-anywhere">{{ row.number }} - {{ row.title }}</span>
                    } @else {
                        <span class="wrap-anywhere">{{ option.view }}</span>
                    }
                </ng-template>
                <ng-template #optionTemplate let-option>
                    @let row = $any(option.row);
                    @if (row) {
                        <div class="column row-gap-1">
                            <span>{{ row.number }} - {{ row.title }}</span>
                            @if (showTopicsInSuggestions() && row.topics?.length) {
                                <div class="row" style="gap: 0.125rem">
                                    @for (topic of row.topics; track topic.key) {
                                        <span class="card bg-{{topic.color}} no-shadow round tiny-text" style="padding: 0.125rem 0.25rem">
                                            {{ topic.label }}
                                        </span>
                                    }
                                </div>
                            }
                        </div>
                    } @else {
                        <span>{{ option.view }}</span>
                    }
                </ng-template>
            </app-select>
            @if (selectedTopics().length) {
                <div class="col-12" style="gap: 0.25rem; flex-wrap: wrap;">
                    <app-input-label [label]="'HYMN_PAGE.TOPICS' | localize"/>
                    @for (topic of selectedTopics(); track topic.key) {
                        <span class="{{topic.color}}-text small-text me-1">
                            {{ topic.label }}
                        </span>
                    }
                </div>
            }
        </div>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, Select, Checkbox, InputLabel],
})
export class FixedHymnPage extends RowPage<'sacrament_meeting'> {

    protected readonly tableName = 'sacrament_meeting';
    protected readonly hymnView = inject(HymnViewService);
    protected readonly hymnTitle = inject(HymnTitleService);
    private readonly language = inject(LanguageService);
    
    protected readonly showTopicsInSuggestions = xsignal(false);

    protected readonly slot = signal<FixedHymnSlot>('opening_hymn');
    protected readonly label = xcomputed([this.slot], slot => slot ? `SACRAMENT_MEETING_PAGE.${slot.toUpperCase()}` : '');

    protected readonly hymnNumber = xcomputed([this.syncedRow.value, this.slot],
        (row, slot) => row && slot ? row[slot] : null);

    protected readonly titleText = asyncComputed([this.hymnNumber, this.language.current],
        async (number, lang) => number ? this.hymnTitle.getTitle(number, lang) : '', '');

    protected readonly hymnOptions = asyncComputed([this.language.current],
        async lang => this.hymnView.getSelectOptions(lang), []);

    protected readonly webUrl = xcomputed([this.hymnNumber],
        number => number ? this.hymnTitle.getWebUrl(number as HymnNumber) : null);

    protected readonly selectedTopics = xcomputed([this.hymnNumber, this.hymnOptions], (number, options) => {
        if (!number)
            return [] as HymnOptionRow['topics'];
        const option = options.find(item => item.value === number);
        const optionRow = option?.row as HymnOptionRow | undefined;
        return optionRow?.topics ?? [];
    });

    protected override getRowIdFromRoute(route: ActivatedRoute): { rowId: number, forceRepaint?: boolean } | null {
        const segment = route.snapshot.url.at(-1)?.path ?? '';
        const [slotPart, idPart] = segment.split('-');
        this.rowId.asPromise().then(() => {
            this.slot.set(`${slotPart as 'opening' | 'sacrament' | 'closing'}_hymn`);
        });
        return idPart ? { rowId: +idPart, forceRepaint: true } : null;
    }
}
