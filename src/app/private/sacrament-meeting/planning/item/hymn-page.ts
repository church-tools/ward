import { HymnNumber } from '@/modules/sacrament-meeting/item/hymn/hymn-numbers';
import { HymnOptionRow, HymnTitleService } from '@/modules/sacrament-meeting/item/hymn/hymn-title.service';
import { HymnViewService } from '@/modules/sacrament-meeting/item/hymn/hymn-view.service';
import { RowDeleteButton } from "@/private/shared/row-delete-button";
import LinkButton from '@/shared/form/button/link/link-button';
import Checkbox from '@/shared/form/checkbox/checkbox';
import { Select } from '@/shared/form/select/select';
import InputLabel from '@/shared/form/shared/input-label';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { asyncComputed, xcomputed, xsignal } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-hymn-page',
    template: `
        <h4 class="mb--4">#{{ syncedRow.value()?.number }}</h4>
        <h3 class="mb-0">{{ titleText() || ('HYMN_PAGE.TITLE' | localize) }}</h3>
        <div class="column-grid">
            <app-select [syncedRow]="syncedRow" column="number"
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
            @if (webUrl(); as url) {
                <app-link-button [href]="url" outside newTab type="secondary" icon="open">
                    <span outside>{{ 'HYMN_PAGE.IN_HYMN_BOOK' | localize }}</span>
                </app-link-button>
            }
        </div>
        <div class="row end-content mt-auto">
            <app-row-delete-button [syncedRow]="syncedRow" backUrl="../.."/>
        </div>
        <app-row-history [row]="syncedRow.value()"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, Select, Checkbox, RowHistory, LinkButton, RowDeleteButton, InputLabel],
})
export class HymnPage extends RowPage<'hymn'> {

    protected readonly tableName = 'hymn';
    protected readonly hymnView = inject(HymnViewService);
    protected readonly hymnTitle = inject(HymnTitleService);
    private readonly language = inject(LanguageService);
    protected readonly showTopicsInSuggestions = xsignal(false);

    protected readonly titleText = asyncComputed([this.syncedRow.value, this.language.current],
        async (row, lang) => row?.number ? this.hymnTitle.getTitle(row.number, lang) : '', '');

    protected readonly hymnOptions = asyncComputed([this.language.current],
        async lang => this.hymnView.getSelectOptions(lang), []);
    
    protected readonly webUrl = xcomputed([this.syncedRow.value],
        row => row?.number ? `https://www.churchofjesuschrist.org/media/music/songs/${this.hymnTitle.getSlug(row.number as HymnNumber)}` : null);

    protected readonly selectedTopics = xcomputed([this.syncedRow.value, this.hymnOptions], (row, options) => {
        if (!row?.number)
            return [] as HymnOptionRow['topics'];
        const option = options.find(item => item.value === row.number);
        const optionRow = option?.row as HymnOptionRow | undefined;
        return optionRow?.topics ?? [];
    });

}
