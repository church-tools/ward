import { Service } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Organization } from "./organization";

@Service()
export class OrganizationViewService extends ViewService<'organization'> {

    readonly icon = 'organization';

    constructor() {
        super('organization');
    }

    toString(row: Organization.Row): string {
        return row.name;
    }
}