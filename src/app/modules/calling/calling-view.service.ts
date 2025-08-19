import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Calling } from "./calling";

@Injectable({ providedIn: 'root' })
export class CallingViewService extends ViewService<'calling'> {

    readonly icon = 'briefcase';

    constructor() {
        super('calling');
    }

    override toString(row: Calling.Row): string {
        return row.name;
    }
}