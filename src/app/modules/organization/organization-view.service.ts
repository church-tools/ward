import { inject, Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Organization } from "./organization";
import { MemberViewService } from "../member/member-view.service";

@Injectable({ providedIn: 'root' })
export class OrganizationViewService extends ViewService<'organization'> {
    
    private readonly memberView = inject(MemberViewService);

    readonly icon = 'organization';

    readonly genderOptions = [
        { value: 'male', view: 'BROTHERS', color: this.memberView.brotherColor },
        { value: 'female', view: 'SISTERS', color: this.memberView.sisterColor },
    ] as const;

    constructor() {
        super('organization');
    }

    toString(row: Organization.Row): string {
        return row.name;
    }
}