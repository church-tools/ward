import { Injectable } from "@angular/core";
import type { PaletteColor } from "@/shared/utils/color-utils";
import { ViewService } from "../shared/view.service";
import type { MemberCalling } from "./member-calling";

@Injectable({ providedIn: 'root' })
export class MemberCallingViewService extends ViewService<'member_calling'> {
    
    readonly icon = 'briefcase';

    readonly stateOptions: readonly { value: MemberCalling.State; view: string; color: PaletteColor }[] = [
        { value: 'proposed', view: 'MEMBER_CALLING_PAGE.STATE.PROPOSED', color: 'powderblue' },
        { value: 'decided', view: 'MEMBER_CALLING_PAGE.STATE.DECIDED', color: 'royalblue' },
        { value: 'accepted', view: 'MEMBER_CALLING_PAGE.STATE.ACCEPTED', color: 'green' },
        { value: 'rejected', view: 'MEMBER_CALLING_PAGE.STATE.REJECTED', color: 'red' },
        { value: 'sustained', view: 'MEMBER_CALLING_PAGE.STATE.SUSTAINED', color: 'goldenrod' },
        { value: 'set_apart', view: 'MEMBER_CALLING_PAGE.STATE.SET_APART', color: 'indigo' },
        { value: 'release_proposed', view: 'MEMBER_CALLING_PAGE.STATE.RELEASE_PROPOSED', color: 'orange' },
        { value: 'release_issued', view: 'MEMBER_CALLING_PAGE.STATE.RELEASE_ISSUED', color: 'coral' },
        { value: 'release_sustained', view: 'MEMBER_CALLING_PAGE.STATE.RELEASE_SUSTAINED', color: 'magenta' },
    ] as const;

    readonly stateOptionsByState = Object.fromEntries(
        this.stateOptions.map(option => [option.value, option])
    ) as Record<MemberCalling.State, (typeof this.stateOptions)[number]>;
    constructor() {
        super('member_calling');
    }

    override toString(memberCalling: MemberCalling.Row): string {
        const { memberName, calling } = memberCalling._calculated;
        return `${memberName} - ${calling?.organization?.name} ${calling?.name}`;
    }
}