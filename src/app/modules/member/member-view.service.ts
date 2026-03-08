import { Injectable } from "@angular/core";
import type { ColorName } from "../../shared/utils/color-utils";
import { ViewService } from "../shared/view.service";
import type { Member } from "./member";

@Injectable({ providedIn: 'root' })
export class MemberViewService extends ViewService<'member'> {
    
    readonly icon = 'people_community';

    readonly brotherColor: ColorName = 'royalblue';
    readonly sisterColor: ColorName = 'deeppink';

    readonly salutationGenderOptions = [
        { value: 'male', view: 'MEMBER_PAGE.BROTHER_SHORT', color: this.brotherColor },
        { value: 'female', view: 'MEMBER_PAGE.SISTER_SHORT', color: this.sisterColor },
    ] as const;

    readonly salutationOptionsByGender = Object.fromEntries(
        this.salutationGenderOptions.map(option => [option.value, option])
    ) as Record<Member.Gender, (typeof this.salutationGenderOptions)[number]>;

    constructor() {
        super('member');
    }

    toString(row: Member.Row): string {
        return `${row.nick_name || row.first_name} ${row.last_name}`;
    }
}