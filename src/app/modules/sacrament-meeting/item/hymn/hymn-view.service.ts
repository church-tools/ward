import { ViewService } from "@/modules/shared/view.service";
import { Injectable } from "@angular/core";
import type { Hymn } from "./hymn";

@Injectable({ providedIn: 'root' })
export class HymnViewService extends ViewService<'hymn'> {

    readonly icon = 'music_note_1';

    constructor() {
        super('hymn');
    }

    toString(item: Hymn.Row): string {
        return item.number ? String(item.number) : '';
    }
}