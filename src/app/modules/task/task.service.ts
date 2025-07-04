import { Injectable } from "@angular/core";
import { TableService } from "../shared/table.service";
import type { Task } from "./task";

@Injectable({ providedIn: 'root' })
export class TaskService extends TableService<'task'> {

    readonly tableName = 'task';
    readonly orderField = 'position';
    readonly createOffline = false;

    override toString(row: Task.Row): string {
        return row.title ?? row.content ?? '';
    }
}