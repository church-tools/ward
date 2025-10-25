import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { Row, TableName } from '../../modules/shared/table.types';
import { mapLangToLocale } from '../../shared/utils/language-utils';
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-row-history',
    template: `
        <div class="translucent-text tiny-text text-align-end">
            @if (updatedBy()) {
                {{ 'HISTORY.UPDATED_BY' | translate }} {{ updatedBy() }}
            }
            @if (updatedAt()) {
                {{ (updatedBy() ? 'HISTORY.UPDATED_AT' : 'HISTORY.FULL_UPDATED_AT') | translate }}
                {{ updatedAt() | date:'medium':undefined:locale() }}
            }
            <br/>
            @if (createdBy()) {
                {{ 'HISTORY.CREATED_BY' | translate }} {{ createdBy() }}
            }
            {{ (createdBy() ? 'HISTORY.CREATED_AT' : 'HISTORY.FULL_CREATED_AT') | translate }}
            {{ createdAt() | date:'medium':undefined:locale() }}
        </div>
    `,
    imports: [DatePipe, TranslatePipe],
})
export class RowHistoryComponent<T extends TableName> {

    readonly row = input.required<Row<T> | null>();

    protected readonly translate = inject(TranslateService);
    
    protected readonly locale = toSignal(this.translate.onLangChange.pipe(
        map(({ lang }) => {
            const currentLang = lang || this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en';
            return mapLangToLocale(currentLang);
        })),
        { initialValue: mapLangToLocale(this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en') }
    );

    protected readonly createdBy = xcomputed([this.row],
        row => row && 'created_by' in row ? row['created_by'] : null);
    protected readonly createdAt = xcomputed([this.row],
        row => row && 'created_at' in row
            ? row['created_at']
            : row && row?.id > 100000 * 1000000000000
                ? new Date(Math.floor(row.id / 100000))
                : null);
    protected readonly updatedBy = xcomputed([this.row],
        row => row && 'updated_by' in row ? row['updated_by'] : null);
    protected readonly updatedAt = xcomputed([this.row, this.createdAt],
        (row, createdAt) => {
            const updatedAt = row && 'updated_at' in row ? row['updated_at'] : null
            if (updatedAt === createdAt) return null;
            return updatedAt;
        });
}