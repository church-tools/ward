import { Injector } from "@angular/core";
import { TableName } from "../../shared/types";
import { ListInsertComponent } from "./list-insert";
import { TableService } from "./table.service";

export async function getTableService<T extends TableName>(injector: Injector, tableName: T) {
    return inject<T, typeof TableService<T>>(injector, 'service', tableName);
}

export async function getListInsertComponent<T extends TableName>(injector: Injector, tableName: T) {
    return inject<T, typeof ListInsertComponent<T>>(injector, 'listInsert', tableName);
}

async function inject<T extends TableName, R extends abstract new (...args: any) => any>(
    injector: Injector, tokenType: keyof typeof tokens, tableName: T): Promise<InstanceType<R>> {
    const entry = tokens[tokenType] as Record<T, () => Promise<R> | undefined>;
    const tokenPromise = entry[tableName]?.();
    if (!tokenPromise) throw new Error(`No token found for: ${tableName}`);
    const token = await tokenPromise;
    return injector.get(token) as InstanceType<R>;

}

const tokens = {
    service: {
        agenda: () => import('../agenda/agenda.service').then(m => m.AgendaService),
        profile: () => import('../profile/profile.service').then(m => m.ProfileService),
    },
    listInsert: {
        agenda: () => import('../agenda/agenda-list-insert').then(m => m.AgendaListInsertComponent),
        profile: undefined,
    },
} as const;