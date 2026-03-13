import { Component, inject, input } from '@angular/core';
import type { Insert, NumberColumn, Row, Table, TableName, TableQuery } from '../../../modules/shared/table.types';
import { RowSelectComponent } from './row-select';
import { SupabaseService } from '../../service/supabase.service';
import { xcomputed } from '../../utils/signal-utils';
import { syncedArraySignal } from '../../utils/supa-sync/synced-array';
import { assureArray } from '../../utils/array-utils';

type RelatedQueryFactory<ParentTable extends TableName, RelatedTable extends TableName> =
	(table: Table<RelatedTable>, parent: Row<ParentTable>) => TableQuery<RelatedTable, Row<RelatedTable>[]>;

type RelationInsertMapper<RelationTable extends TableName> =
	(parentId: number, relatedId: number) => Insert<RelationTable>;

@Component({
	selector: 'app-related-row-select',
	template: `
		<app-row-select [table]="relatedTable()" multiple
			[getQuery]="relatedQuery()"
			[label]="label()"
			[value]="selectedRelatedIds()"
			(valueChange)="onRelatedRowsChange($event)"/>
	`,
	imports: [RowSelectComponent],
})
export class RelatedRowSelectComponent<
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
	readonly label = input<string>()

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
		const parentTable = this.supabase.sync.from(this.parentTable());
		const parentId = parentTable.getId(this.parent());

		await Promise.all([
			addedRelatedIds.length
				? relationTable.insert(addedRelatedIds.map(relatedId => this.mapInsert()(parentId, relatedId)))
				: Promise.resolve([]),
			...removedRelationRows.map(relation => relationTable.delete(relation)),
		]);
	}
}
