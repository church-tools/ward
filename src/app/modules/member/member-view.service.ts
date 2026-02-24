import { Injectable } from "@angular/core";
import type { ColorName } from "../../shared/utils/color-utils";
import { ViewService } from "../shared/view.service";
import type { Member } from "./member";

@Injectable({ providedIn: 'root' })
export class MemberViewService extends ViewService<'member'> {
    
    readonly icon = 'people_community';

    readonly brotherColor: ColorName = 'royalblue';
    readonly sisterColor: ColorName = 'deeppink';

    constructor() {
        super('member');
    }

    toString(row: Member.Row): string {
        return `${row.nick_name || row.first_name} ${row.last_name}`;
    }
}