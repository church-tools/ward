import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Member } from "./member";
import { ColorName } from "../../shared/utils/color-utils";

@Injectable({ providedIn: 'root' })
export class MemberViewService extends ViewService<'member'> {
    
    readonly icon = 'calendar_agenda';

    readonly brotherColor: ColorName = 'royalblue';
    readonly sisterColor: ColorName = 'deeppink';

    constructor() {
        super('member');
    }

    toString(row: Member.Row): string {
        return `${row.nick_name || row.first_name} ${row.last_name}`;
    }
}