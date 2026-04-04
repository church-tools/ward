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
        return item.id;
    }
}
