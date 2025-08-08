import { Injectable } from "@angular/core";
import { TableService } from "../shared/table.service";
import { Calling } from "./calling";

@Injectable({ providedIn: 'root' })
export class CallingService extends TableService<'calling'> {

    readonly tableName = 'calling';
    readonly orderField = 'position';
    readonly createOffline = false;

    override toString(row: Calling.Row): string {
        return row.name;
    }
}