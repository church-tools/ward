import { Injectable } from "@angular/core";
import { AsyncState } from "../../shared/utils/async-state";
import { TableService } from "../shared/table.service";
import { Profile } from "./profile";
import { xeffect } from "../../shared/utils/signal-utils";

@Injectable({ providedIn: 'root' })
export class ProfileService extends TableService<'profile'> {

    readonly tableName = 'profile';
    readonly idField = 'id';
    readonly orderField = null;
    readonly createOffline = true;

    readonly own = new AsyncState<Profile.Row>();
    readonly ownSignal = this.asSignal((row, user) => row.uid === user.id);

    override toString(row: Profile.Row): string {
        return '' + row.id;
    }

    constructor() {
        super();
        xeffect([this.ownSignal], own => own ? this.own.set(own) : this.own.unset());
        this.supabase.getSession()
        .then(session => {
            this.observe(row => row.uid === session?.user.id).subscribe(row => this.own.set(row!));
        });
    }
}