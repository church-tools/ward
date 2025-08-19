import { inject, Injectable, Injector } from "@angular/core";
import { TranslateService, Translation } from "@ngx-translate/core";
import { Observable } from "rxjs";
import { Icon } from "../../shared/icon/icon";
import type { Row, TableName } from "./table.types";

export async function getViewService<T extends TableName>(injector: Injector, tableName: T): Promise<ViewService<T>> {
    const service = await (async () => {
        switch (tableName) {
            case 'profile': return (await import('../profile/profile-view.service')).ProfileViewService;
            case 'agenda': return (await import('../agenda/agenda-view.service')).AgendaViewService;
            case 'agenda_section': return (await import('../agenda/section/agenda-section-view.service')).AgendaSectionViewService;
            case 'task': return (await import('../task/task-view.service')).TaskViewService;
            case 'calling': return (await import('../calling/calling-view.service')).CallingViewService;
            default: throw new Error(`No view service found for table: ${tableName}`);
        }
    })();
    return injector.get(<InstanceType<any>>service);
}

@Injectable({ providedIn: 'root' })
export abstract class ViewService<T extends TableName> {

    protected readonly translate = inject(TranslateService);

    readonly name: Observable<Translation>;
    readonly namePlural: Observable<Translation>;
    abstract readonly icon: Icon;

    constructor(tableName: T) {
        this.name = this.translate.stream(`VIEW.${tableName.toUpperCase()}`);
        this.namePlural = this.translate.stream(`VIEW.${tableName.toUpperCase()}S`);
    }

    abstract toString(row: Row<T>): string;
}