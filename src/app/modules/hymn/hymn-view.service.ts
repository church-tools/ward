import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Hymn } from "./hymn";

@Injectable({ providedIn: 'root' })
export class HymnViewService extends ViewService<'hymn'> {

    readonly icon = 'music_note_1';

    constructor() {
        super('hymn');
    }

    override toString(row: Hymn.Row): string {
        return row.name?.trim() || `#${row.id}`;
    }
}
