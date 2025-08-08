import { Injectable } from "@angular/core";
import { TableService } from "../../shared/table.service";
import type { AgendaSection } from "./agenda-section";

@Injectable({ providedIn: 'root' })
export class AgendaSectionService extends TableService<'agenda_section'> {

    readonly tableName = 'agenda_section';
    readonly orderField = 'position';
    readonly createOffline = false;

    override toString(row: AgendaSection.Row): string {
        return '';
    }
}