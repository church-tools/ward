import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Agenda } from "./agenda";

@Injectable({ providedIn: 'root' })
export class AgendaViewService extends ViewService<'agenda'> {
    
    readonly icon = 'calendar_agenda';
    readonly orderKey = 'position';

    constructor() {
        super('agenda');
    }

    toString(row: Agenda.Row): string {
        return row.name;
    }
}