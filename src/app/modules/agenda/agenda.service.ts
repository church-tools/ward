import { Injectable } from "@angular/core";
import { TableService } from "../shared/table.service";
import type { Agenda } from "./agenda";

@Injectable({ providedIn: 'root' })
export class AgendaService extends TableService<'agenda'> {

    readonly tableName = 'agenda';
    readonly orderField = 'position';
    readonly createOffline = false;

    override toString(row: Agenda.Row): string {
        return row.name;
    }
}