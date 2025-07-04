import { Component, inject, input } from "@angular/core";
import { MaybeAsync } from "@angular/router";
import type { Insert, TableName } from "../../shared/types";
import { UnitService } from "../unit/unit.service";

export async function getListInsertComponent<T extends TableName>(tableName: T) {
    switch (tableName) {
        case 'agenda': return (await import('../agenda/agenda-list-insert')).AgendaListInsertComponent;
        case 'task': return (await import('../task/task-list-insert')).TaskListInsertComponent;
        default: throw new Error(`No list row component found for table: ${tableName}`);
    }
}
@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName> {
    
    private readonly unitService = inject(UnitService);
    
    readonly insert = input.required<(item: Insert<T>) => MaybeAsync<void>>();
    readonly cancel = input.required<() => void>();
    readonly prepareInsert = input<(row: Insert<T>) => void>();

    protected async submit() {
        const unit = await this.unitService.getUnit();
        let rowInfo = this.getRowInfo(unit.id);
        if (!rowInfo) {
            this.cancel()();
            return;
        }
        this.prepareInsert()?.(rowInfo);

        await this.insert()(rowInfo);
    }

    protected abstract getRowInfo(unit: number): Insert<T> | undefined;
}