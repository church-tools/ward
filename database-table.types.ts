import type { Database } from "./database.types.ts";

type Tables = Database["public"]["Tables"];

export type Unit = Tables["unit"]["Row"];
