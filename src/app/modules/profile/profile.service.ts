import { Injectable } from "@angular/core";
import { TableService } from "../shared/table.service";
import { Profile } from "./profile";

@Injectable({ providedIn: 'root' })
export class ProfileService extends TableService<'profile'> {

    readonly tableName = 'profile';
    readonly idField = 'id';
    readonly indexField = null;

    override toString(row: Profile.Row): string {
        return '' + row.id;
    }
}