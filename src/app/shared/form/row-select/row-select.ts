import { booleanAttribute, Component, inject, Injector, input, signal } from "@angular/core";
import type { IdOf, Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { getViewService } from "../../../modules/shared/view.service";
import { SupabaseService } from "../../service/supabase.service";
import { assureArray } from "../../utils/array-utils";
import { xcomputed, xeffect } from "../../utils/signal-utils";
import { MultiSelectComponent } from "../select/multi-select";
import { SelectComponent, SelectOption } from "../select/select";
import { getProviders, InputBaseComponent } from "../shared/input-base";

type TableNameWithId = { [K in TableName]: Row<K> extends { id: number | string } ? K : never }[TableName];
type RowSelectValue<T extends TableName> = IdOf<T> | IdOf<T>[];

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
                (valueChange)="setViewValue($event)">
                <ng-content/>
            </app-select>
        }
    `,
    providers: getProviders(() => RowSelectComponent),
    imports: [SelectComponent, MultiSelectComponent],
})
export class RowSelectComponent<T extends TableNameWithId> extends InputBaseComponent<RowSelectValue<T>> {

    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);

    readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly allowCustom = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly multiple = input<boolean, unknown>(false, { transform: booleanAttribute });

    private readonly optionList = signal<SelectOption<IdOf<T>>[]>([]);
    private viewToString: ((row: Row<T>) => string) | null = null;

    protected readonly singleValue = xcomputed([this.viewValue], value => {
        if (Array.isArray(value))
            return value[0] ?? null;
        return value as IdOf<T> | null;
    });

    protected readonly multipleValue = xcomputed([this.viewValue], value =>
        assureArray(value as IdOf<T> | IdOf<T>[]));

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

    protected override async mapIn(value: RowSelectValue<T> | null): Promise<RowSelectValue<T> | null> {
        if (value == null)
            return value;
        const normalized = this.multiple()
            ? [...assureArray(value as IdOf<T> | IdOf<T>[])] as RowSelectValue<T>
            : (Array.isArray(value) ? (value[0] ?? null) : value) as RowSelectValue<T> | null;
        const selectedIds = assureArray(normalized as IdOf<T> | IdOf<T>[]).filter(v => v != null);
        if (selectedIds.length)
            await this.ensureOptionsForValues(selectedIds);
        const aligned = this.alignValuesToOptions(selectedIds);
        return this.multiple()
            ? [...aligned] as RowSelectValue<T>
            : (aligned[0] ?? null) as RowSelectValue<T> | null;
    }

    protected override mapOut(value: RowSelectValue<T> | null): RowSelectValue<T> | null {
        if (value == null)
            return value;
        return this.multiple()
            ? [...assureArray(value)] as RowSelectValue<T>
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
        return rows.map(row => ({ value: row.id as IdOf<T>, view: toString(row), row }));
    }

    private async getToString() {
        if (!this.viewToString) {
            const viewService = await getViewService(this.injector, this.table());
            this.viewToString = viewService.toString;
        }
        return this.viewToString;
    }

    private alignValuesToOptions(values: IdOf<T>[]) {
        if (!values.length)
            return values;
        const options = this.optionList();
        if (!options.length)
            return values;
        return values.map(value =>
            options.find(option => String(option.value) === String(value))?.value ?? value);
    }
}