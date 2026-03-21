import { Database } from '../../../../database';
import type Table from '../shared/table.types';

export namespace SacramentMeeting {
    export type Insert = Table.Insert<'sacrament_meeting'>;
    export type Update = Table.Update<'sacrament_meeting'>;
    export type Row = Table.Row<'sacrament_meeting'>;
    export type Type = Exclude<Row['type'], null>;
}
