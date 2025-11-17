import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Member } from "./member";

@Injectable({ providedIn: 'root' })
export class MemberViewService extends ViewService<'member'> {
    
    readonly icon = 'calendar_agenda';

    constructor() {
        super('member');
    }

    toString(row: Member.Row): string {
        return `${row.nick_name || row.first_name} ${row.last_name}`;
    }
}