import { ViewService } from "@/modules/shared/view.service";
import { Injectable } from "@angular/core";
import type { Message } from "./message";

@Injectable({ providedIn: 'root' })
export class MessageViewService extends ViewService<'message'> {

    readonly icon = 'presenter';

    constructor() {
        super('message');
    }

    toString(item: Message.Row): string {
        const memberName = item._calculated.memberName?.trim();
        if (memberName)
            return memberName;
        const topic = item.topic?.trim();
        if (topic)
            return topic;
        return this.language.localizeInstant('SACRAMENT_MEETING_PAGE.CUSTOM_TEXT');
    }
}
