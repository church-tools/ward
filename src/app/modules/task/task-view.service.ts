import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Icon } from "../../shared/icon/icon";
import { Task } from "./task";

@Injectable({ providedIn: 'root' })
export class TaskViewService extends ViewService<'task'> {

    readonly icon = 'checkmark_circle';

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

    constructor() {
        super('task');
    }

    override toString(row: Task.Row): string {
        return row.title ?? row.content ?? '';
    }
}