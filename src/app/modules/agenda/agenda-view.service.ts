import { Service } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Agenda } from "./agenda";

@Service()
export class AgendaViewService extends ViewService<'agenda'> {
    
    readonly icon = 'calendar_agenda';

    constructor() {
        super('agenda');
    }

    toString(row: Agenda.Row): string {
        return row.name;
    }
}