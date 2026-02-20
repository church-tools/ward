import { booleanAttribute, Component, inject, Injector, input, signal } from "@angular/core";
import { IdOf, Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { getViewService } from "../../../modules/shared/view.service";
import { SupabaseService } from "../../service/supabase.service";
import { assureArray } from "../../utils/array-utils";
import { xcomputed, xeffect } from "../../utils/signal-utils";
import { SelectComponent } from "../select/select";
import { getProviders, InputBaseComponent } from "../shared/input-base";

type TableNameWithId = { [K in TableName]: Row<K> extends { id: number | string } ? K : never }[TableName];
type RowSelectValue<T extends TableName> = IdOf<T> | IdOf<T>[];

@Component({
    selector: 'app-row-select',
    template: `
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
            [allowClear]="allowClear() && !multiple()"
            [holdsValue]="!multiple()"
            (valueChange)="selectValue($event)">
            @if (multiple() && selectedOptions().length) {
                <div class="row wrap gap-1">
                    @for (option of selectedOptions(); track option.value) {
                        <button type="button" class="btn subtle" [disabled]="disabled()"
                            (click)="toggleSelection(option.value)">
                            {{ option.view }}
                        </button>
                    }
                    @if (allowClear() && !disabled()) {
                        <button type="button" class="btn subtle" (click)="clearSelections()">✕</button>
                    }
                </div>
            }
        </app-select>
    `,
    providers: getProviders(() => RowSelectComponent),
    imports: [SelectComponent],
})
export class RowSelectComponent<T extends TableNameWithId> extends InputBaseComponent<RowSelectValue<T>> {

    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);

    readonly allowClear = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly allowCustom = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly multiple = input<boolean, unknown>(false, { transform: booleanAttribute });

    private readonly optionList = signal<{ value: IdOf<T>; view: string; }[]>([]);
    private viewToString: ((row: Row<T>) => string) | null = null;

    protected readonly selectedOptions = xcomputed([this.optionList, this.viewValue, this.multiple],
        (options, value, multiple) => {
            const selectedValues = multiple ? assureArray(value as IdOf<T> | IdOf<T>[]) : [value as IdOf<T> | null];
            const selectedSet = new Set(selectedValues.filter(v => v != null));
            return options.filter(o => selectedSet.has(o.value as IdOf<T>));
        });

    protected readonly singleValue = xcomputed([this.viewValue, this.multiple], (value, multiple) => {
        if (multiple)
            return null;
        if (Array.isArray(value))
            return value[0] ?? null;
        return value;
    });

    constructor() {
        super();
        xeffect([this.table, this.getQuery], () => {
            this.optionList.set([]);
        });
    }

    protected getOptions = async (search: string) => {
        if (this.optionList().length)
            return this.optionList();
        const table = this.supabase.sync.from<T>(this.table());
        const query = this.getQuery()?.(table) ?? table.readAll();
        const rows = await query.get();
        const options = await this.mapRowsToOptions(rows);
        this.optionList.set(options);
        return options;
    }

    protected selectValue(value: RowSelectValue<T> | null) {
        const selectedValue = Array.isArray(value) ? (value[0] ?? null) : value;
        if (!this.multiple()) {
            this.setViewValue(selectedValue as RowSelectValue<T> | null);
            return;
        }
        if (selectedValue == null) return;
        this.toggleSelection(selectedValue as IdOf<T>);
    }

    protected toggleSelection(value: IdOf<T>) {
        const selected = assureArray(this.viewValue() as IdOf<T> | IdOf<T>[]);
        const index = selected.indexOf(value);
        if (index >= 0)
            selected.splice(index, 1);
        else
            selected.push(value);
        this.setViewValue(selected as RowSelectValue<T>);
    }

    protected clearSelections() {
        this.setViewValue([] as RowSelectValue<T>);
    }

    protected override async mapIn(value: RowSelectValue<T> | null): Promise<RowSelectValue<T> | null> {
        if (value == null)
            return value;
        const normalized = this.multiple()
            ? assureArray(value as IdOf<T> | IdOf<T>[]) as RowSelectValue<T>
            : (Array.isArray(value) ? (value[0] ?? null) : value) as RowSelectValue<T> | null;
        const selectedIds = assureArray(normalized as IdOf<T> | IdOf<T>[]).filter(v => v != null);
        if (selectedIds.length)
            await this.ensureOptionsForValues(selectedIds);
        return normalized;
    }

    protected override mapOut(value: RowSelectValue<T> | null): RowSelectValue<T> | null {
        if (value == null)
            return value;
        return this.multiple()
            ? assureArray(value as IdOf<T> | IdOf<T>[]) as RowSelectValue<T>
            : (Array.isArray(value) ? (value[0] ?? null) : value) as RowSelectValue<T> | null;
    }

    private async ensureOptionsForValues(values: IdOf<T>[]) {
        await this.getOptions('');
        const currentOptions = this.optionList();
        const existingValues = new Set(currentOptions.map(option => option.value));
        const missingValues = values.filter(value => !existingValues.has(value));
        if (!missingValues.length) return;
        const table = this.supabase.sync.from<T>(this.table());
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
        return rows.map(row => ({ value: row.id as IdOf<T>, view: toString(row) }));
    }

    private async getToString() {
        if (!this.viewToString) {
            const viewService = await getViewService(this.injector, this.table());
            this.viewToString = viewService.toString;
        }
        return this.viewToString;
    }
}