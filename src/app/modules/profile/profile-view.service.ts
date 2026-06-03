import { Service } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { Profile } from "./profile";

@Service()
export class ProfileViewService extends ViewService<'profile'> {

    readonly icon = 'person';
    
    constructor() {
        super('profile');
    }
    
    override toString(row: Profile.Row): string {
        return row.email;
    }
}