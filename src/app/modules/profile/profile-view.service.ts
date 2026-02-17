import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";
import { Profile } from "./profile";

@Injectable({ providedIn: 'root' })
export class ProfileViewService extends ViewService<'profile'> {

    readonly icon = 'person';
    
    constructor() {
        super('profile');
    }
    
    override toString(row: Profile.Row): string {
        return row.email;
    }
}