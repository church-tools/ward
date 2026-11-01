import { Service } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Household } from "./household";

@Service()
export class HouseholdViewService extends ViewService<'household'> {

    readonly icon = 'home';

    constructor() {
        super('household');
    }

    toString(row: Household.Row): string {
        return row.name;
    }
}
