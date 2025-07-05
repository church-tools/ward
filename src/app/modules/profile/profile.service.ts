import { Injectable } from "@angular/core";
import { TableService } from "../shared/table.service";
import { Profile } from "./profile";
import { AsyncState } from "../../shared/utils/async-state";

@Injectable({ providedIn: 'root' })
export class ProfileService extends TableService<'profile'> {

    readonly tableName = 'profile';
    readonly idField = 'id';
    readonly orderField = null;
    readonly createOffline = true;

    readonly own = new AsyncState<Profile.Row>();

    override toString(row: Profile.Row): string {
        return '' + row.id;
    }

    getOwnAsSignal() {
        return this.asSignal((row, user) => row.uid === user.id);
    }

    constructor() {
        super();
        this.supabase.getSession()
        .then(session => {
            this.observe(row => row.uid === session?.user.id).subscribe(row => this.own.set(row!));
        });
    }
}