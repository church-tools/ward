import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Icon } from "../../shared/icon/icon";

@Injectable({ providedIn: 'root' })
export class TaskViewService extends ViewService<'task'> {

    readonly icon = 'checkmark_circle';
    readonly name = this.translate.stream('VIEW.TASK');
    readonly namePlural = this.translate.stream('VIEW.TASKS');

    readonly suggestion = {
        icon: 'lightbulb' as Icon,
        name: this.translate.stream('VIEW.TASK_SUGGESTION'),
        namePlural: this.translate.stream('VIEW.TASK_SUGGESTIONS'),
    } as const;

    readonly topic = {
        icon: 'text_bullet_list_tree' as Icon,
        name: this.translate.stream('VIEW.TASK_TOPIC'),
        namePlural: this.translate.stream('VIEW.TASK_TOPICS'),
    } as const;

}