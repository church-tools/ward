import type { Insert, NumberColumn, Row, Table, TableName, TableQuery } from '@/modules/shared/table.types';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { SupabaseService } from '../../service/supabase.service';
import { assureArray } from '../../utils/array-utils';
import { xcomputed } from '../../utils/signal-utils';
import { syncedArraySignal } from '../../utils/supa-sync/synced-array';
import type { SelectOption } from '../select/select-utils';
import { RowSelect } from './row-select';

type RelatedQueryFactory<ParentTable extends TableName, RelatedTable extends TableName> =
	(table: Table<RelatedTable>, parent: Row<ParentTable>) => TableQuery<RelatedTable, Row<RelatedTable>[]>;

type RelationInsertMapper<RelationTable extends TableName> =
	(parentId: number, relatedId: number) => Insert<RelationTable>;

@Component({
	selector: 'app-related-row-select',
	template: `
		<app-row-select [table]="relatedTable()"
			[multiple]="multiple()"
			[getQuery]="relatedQuery()"
			[label]="label()"
			[value]="selectedRelatedIds()"
			(valueChange)="onRelatedRowsChange($event)"
			[onOptionClick]="onRelatedClick()"
			[hideClear]="hideClear()"/>
	`,
	imports: [RowSelect],
})
export class RelatedRowSelect<
	ParentTable extends TableName,
	RelatedTable extends TableName,
	RelationTable extends TableName,
> {
	private readonly supabase = inject(SupabaseService);

	readonly parent = input.required<Row<ParentTable>>();
	readonly parentTable = input.required<ParentTable>();
	readonly parentIdKey = input.required<NumberColumn<RelationTable>>();
	readonly relatedTable = input.required<RelatedTable>();
	readonly relationTable = input.required<RelationTable>();
	readonly getRelatedQuery = input<RelatedQueryFactory<ParentTable, RelatedTable> | null>(null);
	readonly relatedIdKey = input.required<NumberColumn<RelationTable>>();
	readonly mapInsert = input.required<RelationInsertMapper<RelationTable>>();
	readonly label = input<string>();
	readonly multiple = input<boolean, unknown>(false, { transform: booleanAttribute });
	readonly onRelationClick = input<(relationId: number) => void>();
	readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });

	protected readonly onRelatedClick = xcomputed([this.parentTable, this.parentIdKey, this.relatedIdKey, this.relationTable, this.onRelationClick],
		(parentTable, parentIdKey, relatedIdKey, relationTable, onRelationClick) => {
			if (!onRelationClick) return;
			return (option: SelectOption<number | string>, event: MouseEvent) => {
				event.stopPropagation();
				event.preventDefault();
				if (typeof option.value !== 'number')
					return;
				const relationId = this.getRelationId(parentTable, relationTable, parentIdKey, relatedIdKey, option.value);
				onRelationClick(relationId);
			};
		}
	);

	protected readonly relatedQuery = xcomputed([this.parent, this.getRelatedQuery], (parent, getRelatedQuery) =>
		(table: Table<RelatedTable>) => getRelatedQuery?.(table, parent) ?? table.readAll());

	protected readonly selectedRelations = syncedArraySignal([this.parent, this.parentTable, this.relationTable, this.parentIdKey],
		(parent, parentTableName, relationTable, parentIdKey) => {
		const parentTable = this.supabase.sync.from(parentTableName);
		return this.supabase.sync.from(relationTable).find().eq(parentIdKey, parentTable.getId(parent) as any);
	});

	protected readonly selectedRelatedIds = xcomputed([this.selectedRelations, this.relatedIdKey],
		(relations, relatedIdKey) => relations.map(relation => Number(relation[relatedIdKey])));
	
	protected async onRelatedRowsChange(value: number | number[] | null) {
		const currentRelatedIdSet = new Set(this.selectedRelatedIds());
		const newRelatedIds = assureArray(value);
		const newRelatedIdSet = new Set(newRelatedIds);
		const addedRelatedIds = newRelatedIds.filter(id => !currentRelatedIdSet.has(id));
		const relatedIdKey = this.relatedIdKey();
		const removedRelationRows = this.selectedRelations().filter(relation =>
			!newRelatedIdSet.has(Number(relation[relatedIdKey])));
		const relationTable = this.supabase.sync.from(this.relationTable());
		const parentId = this.getParentId(this.parentTable());

		await Promise.all([
			addedRelatedIds.length
				? relationTable.insert(addedRelatedIds.map(relatedId => this.mapInsert()(parentId, relatedId)))
				: Promise.resolve([]),
			...removedRelationRows.map(relation => relationTable.delete(relation)),
		]);
	}

	private getParentId(parentTableName: ParentTable) {
		const parentTable = this.supabase.sync.from(parentTableName);
		return parentTable.getId(this.parent());
	}

	private getRelationId(
		parentTableName: ParentTable,
		relationTableName: RelationTable,
		parentIdKey: NumberColumn<RelationTable>,
		relatedIdKey: NumberColumn<RelationTable>,
		relatedId: number,
	) {
		const parentId = this.getParentId(parentTableName);
		const relationRow = { [parentIdKey]: parentId, [relatedIdKey]: relatedId } as unknown as Row<RelationTable>;
		return this.supabase.sync.from(relationTableName).getId(relationRow);
	}
}
