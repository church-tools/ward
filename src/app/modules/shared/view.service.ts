import { inject, Injectable, Injector } from "@angular/core";
import { TranslateService, Translation } from "@ngx-translate/core";
import { Observable } from "rxjs";
import { Icon } from "../../shared/icon/icon";
import { TableName } from "../../shared/types";

export async function getViewService<T extends TableName>(injector: Injector, tableName: T) {
    const service = await (async () => {
        switch (tableName) {
            case 'calling': return (await import('../calling/calling-view.service')).CallingViewService;
            default: throw new Error(`No view service found for table: ${tableName}`);
        }
    })();
    return <ViewService<T>>injector.get(<InstanceType<any>>service);
}

@Injectable({ providedIn: 'root' })
export abstract class ViewService<T extends TableName> {

    protected readonly translate = inject(TranslateService);

    abstract readonly name: Observable<Translation>;
    abstract readonly namePlural: Observable<Translation>;
    abstract readonly icon: Icon;

}