import type { IconCode } from "@/shared/icon/icon";
import { LanguageService } from "@/shared/language/language.service";
import { inject, Injectable, Injector, Signal } from "@angular/core";
import type { Row, TableName } from "./table.types";

export async function getViewService<T extends TableName>(injector: Injector, tableName: T): Promise<ViewService<T>> {
    const service = await (async () => {
        switch (tableName) {
            case 'profile': return (await import('../profile/profile-view.service')).ProfileViewService;
            case 'agenda': return (await import('../agenda/agenda-view.service')).AgendaViewService;
            case 'agenda_section': return (await import('../agenda/section/agenda-section-view.service')).AgendaSectionViewService;
            case 'agenda_item': return (await import('../agenda/item/agenda-item-view.service')).AgendaItemViewService;
            case 'calling': return (await import('../calling/calling-view.service')).CallingViewService;
            case 'organization': return (await import('../organization/organization-view.service')).OrganizationViewService;
            case 'member': return (await import('../member/member-view.service')).MemberViewService;
            case 'member_calling': return (await import('../member-calling/member-calling-view.service')).MemberCallingViewService;
            case 'sacrament_meeting': return (await import('../sacrament-meeting/sacrament-meeting-view.service')).SacramentMeetingViewService;
            case 'message': return (await import('../sacrament-meeting/item/message/message-view.service')).MessageViewService;
            case 'hymn': return (await import('../sacrament-meeting/item/hymn/hymn-view.service')).HymnViewService;
            case 'musical_performance': return (await import('../sacrament-meeting/item/musical-performance/musical-performance-view.service')).MusicalPerformanceViewService;
            default: throw new Error(`No view service found for table: ${String(tableName)}`);
        }
    })();
    return injector.get(<InstanceType<any>>service);
}

@Injectable({ providedIn: 'root' })
export abstract class ViewService<T extends TableName> {

    protected readonly language = inject(LanguageService);

    readonly name: Signal<string>;
    readonly namePlural: Signal<string>;
    abstract readonly icon: IconCode;

    constructor(tableName: T) {
        this.name = this.language.stream(`VIEW.${String(tableName).toUpperCase()}`);
        this.namePlural = this.language.stream(`VIEW.${String(tableName).toUpperCase()}S`);
    }

    abstract toString(row: Row<T>): string;
}
