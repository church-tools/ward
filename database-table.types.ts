import type { Database } from "./database.types.ts";

type Tables = Database["public"]["Tables"];

export type Collections = keyof Tables;

export type Unit = Tables["unit"]["Row"];
export type Profile = Tables["profile"]["Row"];
export type Agenda = Tables["agenda"]["Row"];