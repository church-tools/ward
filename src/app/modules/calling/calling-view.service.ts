import { inject, Injectable } from "@angular/core";
import { MemberViewService } from "../member/member-view.service";
import { ViewService } from "../shared/view.service";
import type { Calling } from "./calling";

@Injectable({ providedIn: 'root' })
export class CallingViewService extends ViewService<'calling'> {

    private readonly memberView = inject(MemberViewService);
    
    readonly icon = 'briefcase';

    readonly genderOptions = [
        { value: 'male', view: 'BROTHERS', color: this.memberView.brotherColor },
        { value: 'female', view: 'SISTERS', color: this.memberView.sisterColor },
    ] as const;

    constructor() {
        super('calling');
    }

    override toString(row: Calling.Row): string {
        return `${row._calculated.organization?.name} ${row.name}`;
    }
}