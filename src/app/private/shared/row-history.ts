import type { Row, TableName } from '@/modules/shared/table.types';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { xcomputed } from '@/shared/utils/signal-utils';
import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';

@Component({
    selector: 'app-row-history',
    template: `
        <div class="translucent-text tiny-text text-align-end">
            @let updatedBy = this.updatedBy();
            @if (updatedBy) { {{ 'HISTORY.UPDATED_BY' | localize }} {{ updatedBy }} }
            @let updatedAt = this.updatedAt();
            @if (updatedAt) {
                {{ (updatedBy ? 'HISTORY.UPDATED_AT' : 'HISTORY.FULL_UPDATED_AT') | localize }}
                {{ updatedAt | date:'medium':undefined:language.locale() }}
                <br/>
            }
            @let createdBy = this.createdBy();
            @let createdAt = this.createdAt();
            @if (createdBy) { {{ 'HISTORY.CREATED_BY' | localize }} {{ createdBy }} }
            @if (createdAt) {
                {{ (createdBy ? 'HISTORY.CREATED_AT' : 'HISTORY.FULL_CREATED_AT') | localize }}
                {{ createdAt | date:'medium':undefined:language.locale() }}
            } @else if (!updatedAt) {
                {{ 'HISTORY.UNSAVED' | localize }}
            }
        </div>
    `,
    imports: [DatePipe, LocalizePipe],
})
export class RowHistory<T extends TableName> {

    readonly row = input.required<Row<T> | null>();

    protected readonly language = inject(LanguageService);

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