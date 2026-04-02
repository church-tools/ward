import { ViewService } from "@/modules/shared/view.service";
import { Injectable } from "@angular/core";
import type { Singing } from "./singing";
import { getSacramentMeetingSingingText } from "../sacrament-meeting-item.utils";

@Injectable({ providedIn: 'root' })
export class SingingViewService extends ViewService<'singing'> {

    readonly icon = 'music_note_1';

    constructor() {
        super('singing');
    }

    toString(item: Singing.Row): string {
        return getSacramentMeetingSingingText(item);
    }
}