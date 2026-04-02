import { ViewService } from "@/modules/shared/view.service";
import { Injectable } from "@angular/core";
import type { Message } from "./message";
import { getSacramentMeetingMessageText } from "../sacrament-meeting-item.utils";

@Injectable({ providedIn: 'root' })
export class MessageViewService extends ViewService<'message'> {

    readonly icon = 'book_open_microphone';

    constructor() {
        super('message');
    }

    toString(item: Message.Row): string {
        return getSacramentMeetingMessageText(item);
    }
}
