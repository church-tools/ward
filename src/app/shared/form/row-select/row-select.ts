import { booleanAttribute, Component, inject, Injector, input, signal } from "@angular/core";
import type { Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { SupabaseService } from "../../service/supabase.service";
import { assureArray } from "../../utils/array-utils";
import { xcomputed, xeffect } from "../../utils/signal-utils";
import { MultiSelect } from "../select/multi-select";
import { Select, SelectOption } from "../select/select";
import { getProviders, InputBase } from "../shared/input-base";
import { getRowViewToString, resolveRowQuery } from "./row-select-utils";

@Component({
    selector: 'app-row-select',
    template: `
        @if (multiple()) {
            <app-multi-select [options]="getOptions"
                [value]="multipleValue()"
                [label]="label()"
                [labelIcon]="labelIcon()"
                [info]="info()"
                [placeholder]="placeholder()"
                [required]="required()"
                [hideRequiredIndicator]="hideRequiredIndicator()"
                [subtle]="subtle()"
                [disabled]="disabled()"
                [hideClear]="hideClear()"
                [onOptionClick]="onOptionClick()"
                (valueChange)="setViewValue($event)">
                <ng-content/>
            </app-multi-select>
        } @else {
            <app-select [options]="getOptions"
                [value]="singleValue()"
                [label]="label()"
                [labelIcon]="labelIcon()"
                [info]="info()"
                [placeholder]="placeholder()"
                [required]="required()"
                [hideRequiredIndicator]="hideRequiredIndicator()"
                [subtle]="subtle()"
                [disabled]="disabled()"
                [hideClear]="hideClear()"
                [onOptionClick]="onOptionClick()"
                (valueChange)="setViewValue($event)">
                <ng-content/>
            </app-select>
        }
    `,
    providers: getProviders(() => RowSelect),
    imports: [Select, MultiSelect],
})
export class RowSelect<T extends TableName> extends InputBase<number | number[]> {

    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);

    readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly multiple = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly onOptionClick = input<(option: SelectOption<number>, event: MouseEvent) => void>();

    private readonly _table = xcomputed([this.table], t => this.supabase.sync.from(t));
    private readonly optionList = signal<SelectOption<number>[]>([]);
    private viewToString: ((row: Row<T>) => string) | null = null;

    protected readonly singleValue = xcomputed([this.viewValue], value => {
        if (Array.isArray(value))
            return value[0] ?? null;
        return value as number | null;
    });

    protected readonly multipleValue = xcomputed([this.viewValue], value => assureArray(value));
    
    constructor() {
        super();
        xeffect([this.table, this.getQuery], () => {
            this.optionList.set([]);
        });
    }

    protected getOptions = async (search: string) => {
        if (this.optionList().length)
            return this.optionList();
        const query = resolveRowQuery(this._table(), this.getQuery());
        const rows = await query.get();
        const options = await this.mapRowsToOptions(rows);
        this.optionList.set(options);
        return options;
    }

    protected override async mapIn(value: number | number[] | null): Promise<number | number[] | null> {
        if (value == null)
            return value;
        const normalized = this.multiple()
            ? [...assureArray(value)]
            : (Array.isArray(value) ? (value[0] ?? null) : value) as number | null;
        const selectedIds = assureArray(normalized).filter(v => v != null);
        if (selectedIds.length)
            await this.ensureOptionsForValues(selectedIds);
        const aligned = this.alignValuesToOptions(selectedIds);
        return this.multiple()
            ? [...aligned]
            : (aligned[0] ?? null);
    }

    protected override mapOut(value: number | number[] | null): number | number[] | null {
        if (value == null)
            return value;
        return this.multiple()
            ? [...assureArray(value)]
            : (Array.isArray(value) ? (value[0] ?? null) : value);
    }

    private async ensureOptionsForValues(values: number[]) {
        await this.getOptions('');
        const currentOptions = this.optionList();
        const existingValues = new Set(currentOptions.map(option => option.value));
        const missingValues = values.filter(value => !existingValues.has(value));
        if (!missingValues.length) return;
        const table = this._table();
        const rows = await table.readMany(missingValues as unknown as IDBValidKey[]).get();
        if (!rows.length) return;
        const missingOptions = await this.mapRowsToOptions(rows);
        const dedupe = new Set(currentOptions.map(option => option.value));
        this.optionList.set([
            ...currentOptions,
            ...missingOptions.filter(option => {
                if (dedupe.has(option.value))
                    return false;
                dedupe.add(option.value);
                return true;
            }),
        ]);
    }

    private async mapRowsToOptions(rows: Row<T>[]) {
        const toString = await this.getToString();
        const getId = this._table().getId;
        return rows.map(row => ({ value: getId(row), view: toString(row), row }));
    }

    private async getToString() {
        if (!this.viewToString) {
            this.viewToString = await getRowViewToString(this.injector, this.table());
        }
        return this.viewToString;
    }

    private alignValuesToOptions(values: number[]) {
        if (!values.length)
            return values;
        const options = this.optionList();
        if (!options.length)
            return values;
        return values.map(value =>
            options.find(option => String(option.value) === String(value))?.value ?? value);
    }
}