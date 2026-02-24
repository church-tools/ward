import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { MemberCallingCalculatedValues } from "./member-calling-calculated";
import type { MemberCalling } from "./member-calling";

@Injectable({ providedIn: 'root' })
export class MemberCallingViewService extends ViewService<'member_calling', MemberCallingCalculatedValues> {
    
    readonly icon = 'briefcase';

    constructor() {
        super('member_calling');
    }

    override toString(memberCalling: MemberCalling.Row): string {
        const { memberName, callingName } = memberCalling._calculated;
        return `${memberName} - ${callingName}`;
    }
}