import { Injectable } from "@angular/core";
import { Icon } from "../../shared/icon/icon";
import { ViewService } from "../shared/view.service";
import { AgendaItem } from "./agenda-item";

@Injectable({ providedIn: 'root' })
export class AgendaItemViewService extends ViewService<'agenda_item'> {

    readonly icon = 'checkmark_circle';

    readonly resolution = {
        icon: 'gavel' as Icon,
        name: this.translate.stream('VIEW.AGENDA_ITEM_RESOLUTION'),
        namePlural: this.translate.stream('VIEW.AGENDA_ITEM_RESOLUTIONS'),
    } as const;

    readonly suggestion = {
        icon: 'lightbulb' as Icon,
        name: this.translate.stream('VIEW.AGENDA_ITEM_SUGGESTION'),
        namePlural: this.translate.stream('VIEW.AGENDA_ITEM_SUGGESTIONS'),
    } as const;

    readonly topic = {
        icon: 'text_bullet_list_tree' as Icon,
        name: this.translate.stream('VIEW.AGENDA_ITEM_TOPIC'),
        namePlural: this.translate.stream('VIEW.AGENDA_ITEM_TOPICS'),
    } as const;

    constructor() {
        super('agenda_item');
    }

    override toString(row: AgendaItem.Row): string {
        return row.title ?? row.content ?? '';
    }
}