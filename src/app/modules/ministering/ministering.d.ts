import type { Database } from "@root/database";
import type Table from "../shared/table.types";

export namespace MinisteringDistrict {
    export type Insert = Table.Insert<"ministering_district">;
    export type Update = Table.Update<"ministering_district">;
    export type Row = Table.Row<"ministering_district">;
}

export namespace MinisteringArea {
    export type Insert = Table.Insert<"ministering_area">;
    export type Update = Table.Update<"ministering_area">;
    export type Row = Table.Row<"ministering_area">;
}

export namespace MemberMinisteringIn {
    export type Insert = Table.Insert<"member_ministering_in">;
    export type Update = Table.Update<"member_ministering_in">;
    export type Row = Table.Row<"member_ministering_in">;
}

export namespace HouseholdMinisteredIn {
    export type Insert = Table.Insert<"household_ministered_in">;
    export type Update = Table.Update<"household_ministered_in">;
    export type Row = Table.Row<"household_ministered_in">;
}

export namespace Ministering {
    export type Gender = Database["public"]["Enums"]["gender"];
}
