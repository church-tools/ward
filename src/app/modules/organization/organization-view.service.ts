import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Organization } from "./organization";

@Injectable({ providedIn: 'root' })
export class OrganizationViewService extends ViewService<'organization'> {
    
    readonly icon = 'organization';

    constructor() {
        super('organization');
    }

    toString(row: Organization.Row): string {
        return row.name;
    }
}