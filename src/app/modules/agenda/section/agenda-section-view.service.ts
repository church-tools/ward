import { inject, Injectable } from "@angular/core";
import { Translation } from '@ngx-translate/core';
import { Observable } from "rxjs";
import { Icon } from "../../../shared/icon/icon";
import { CallingViewService } from "../../calling/calling-view.service";
import { AgendaItemViewService } from "../../item/agenda-item-view.service";
import { ViewService } from "../../shared/view.service";
import { AgendaSection } from "./agenda-section";

@Injectable({ providedIn: 'root' })
export class AgendaSectionViewService extends ViewService<'agenda_section'> {

    private readonly callingView = inject(CallingViewService);
    private readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly icon = 'center_vertical';

    public readonly typeOptions: { type: AgendaSection.Type, label: Observable<Translation>, icon?: Icon}[] = [
        { type: 'text', icon: 'text_description', label: this.translate.stream('AGENDA_SECTION_TYPE.TEXT') },
        { type: 'callings', icon: this.callingView.icon, label: this.callingView.namePlural },
        { type: 'suggestions', icon: this.agendaItemView.suggestion.icon, label: this.agendaItemView.suggestion.namePlural },
        { type: 'topics', icon: this.agendaItemView.topic.icon, label: this.agendaItemView.topic.namePlural },
        { type: 'resolutions', icon: this.agendaItemView.resolution.icon, label: this.agendaItemView.resolution.namePlural },
        { type: 'prayer', icon: 'handshake', label: this.translate.stream('AGENDA_SECTION_TYPE.PRAYER') },
        { type: 'spiritual_thought', icon: 'fire', label: this.translate.stream('AGENDA_SECTION_TYPE.SPIRITUAL_THOUGHT') },
    ] as const;

    private readonly labelsByType = Object.fromEntries(this.typeOptions.map(option => [option.type, option.label]));

    constructor() {
        super('agenda_section');
    }

    override toString(row: AgendaSection.Row): string {
        // return this.labelsByType[row.type];
        return "";
    }
}