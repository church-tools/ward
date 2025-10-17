import { Injectable, signal } from "@angular/core";
import { TableName } from "../modules/shared/table.types";

@Injectable({
    providedIn: 'root',
})
export class RowPageService {

    private readonly _openRows = signal<{ [table: TableName | string]: number }>( {});
    public readonly openRows = this._openRows.asReadonly();

    pageOpened(table: TableName, id: number) {
        this._openRows.update(openRows => ({ ...openRows, [table]: id }));
    }

    pageClosed(table: TableName, id: number) {
        this._openRows.update(openRows => {
            const updated = { ...openRows };
            if (updated[table] === id)
                delete updated[table];
            return updated;
        });
    }
}
