import { inject, Injectable } from "@angular/core";
import { Translation } from '@ngx-translate/core';
import { Observable } from "rxjs";
import { Icon } from "../../../shared/icon/icon";
import { CallingViewService } from "../../calling/calling-view.service";
import { ViewService } from "../../shared/view.service";
import { TaskViewService } from "../../task/task-view.service";
import { AgendaSection } from "./agenda-section";

@Injectable({ providedIn: 'root' })
export class AgendaSectionViewService extends ViewService<'agenda_section'> {

    private readonly callingView = inject(CallingViewService);
    private readonly taskView = inject(TaskViewService);
    
    readonly icon = 'center_vertical';
    readonly name = this.translate.stream('VIEW.AGENDA_SECTION');
    readonly namePlural = this.translate.stream('VIEW.AGENDA_SECTIONS');

    public readonly typeOptions: { type: AgendaSection.Type, label: Observable<Translation>, icon?: Icon}[] = [
        { type: 'text', icon: 'text_description', label: this.translate.stream('AGENDA_SECTION_TYPE.TEXT') },
        { type: 'callings', icon: this.callingView.icon, label: this.callingView.namePlural },
        { type: 'task_suggestions', icon: this.taskView.suggestion.icon, label: this.taskView.suggestion.namePlural },
        { type: 'tasks', icon: this.taskView.topic.icon, label: this.taskView.topic.namePlural },
        { type: 'followups', icon: this.taskView.icon, label: this.taskView.namePlural },
        { type: 'prayer', icon: 'handshake', label: this.translate.stream('AGENDA_SECTION_TYPE.PRAYER') },
        { type: 'spiritual_thought', icon: 'fire', label: this.translate.stream('AGENDA_SECTION_TYPE.SPIRITUAL_THOUGHT') },
    ] as const;
}