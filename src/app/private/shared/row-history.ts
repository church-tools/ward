import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { Row, TableName } from '../../modules/shared/table.types';
import { createTranslateLocaleSignal } from '../../shared/utils/language-utils';
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-row-history',
    template: `
        <div class="translucent-text tiny-text text-align-end">
            @let updatedBy = this.updatedBy();
            @if (updatedBy) { {{ 'HISTORY.UPDATED_BY' | translate }} {{ updatedBy }} }
            @let updatedAt = this.updatedAt();
            @if (updatedAt) {
                {{ (updatedBy ? 'HISTORY.UPDATED_AT' : 'HISTORY.FULL_UPDATED_AT') | translate }}
                {{ updatedAt | date:'medium':undefined:locale() }}
                <br/>
            }
            @let createdBy = this.createdBy();
            @let createdAt = this.createdAt();
            @if (createdBy) { {{ 'HISTORY.CREATED_BY' | translate }} {{ createdBy }} }
            @if (createdAt) {
                {{ (createdBy ? 'HISTORY.CREATED_AT' : 'HISTORY.FULL_CREATED_AT') | translate }}
                {{ createdAt | date:'medium':undefined:locale() }}
            } @else if (!updatedAt) {
                {{ 'HISTORY.UNSAVED' | translate }}
            }
        </div>
    `,
    imports: [DatePipe, TranslatePipe],
})
export class RowHistory<T extends TableName> {

    readonly row = input.required<Row<T> | null>();

    protected readonly translate = inject(TranslateService);

    protected readonly locale = createTranslateLocaleSignal(this.translate);

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