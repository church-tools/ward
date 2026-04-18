import type { TableName } from "@/modules/shared/table.types";
import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, signal, Type } from "@angular/core";
import { ActivatedRoute, ParamMap, Router, UrlTree } from "@angular/router";
import { Subscription } from "rxjs";
import { Popover } from "./popover";
import { xcomputed } from "../../utils/signal-utils";
import { ConfirmPopover } from "./confirm-popover";

type RowPopoverTarget = { tableName: TableName; id: number };
type RowPopoverPage = { setPopoverRowId: (id: number) => Promise<void> | void };

@Injectable({
    providedIn: 'root',
})
export class PopoverService {

    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(EnvironmentInjector);
    private readonly router = inject(Router);

    private readonly hostRef = signal<ComponentRef<Popover> | null>(null);
    private readonly openedRowPopover = signal<RowPopoverTarget | null>(null);
    private readonly rowPopoverTargetWritable = signal<RowPopoverTarget | null>(null);
    private syncToken = 0;

    readonly rowPopoverTarget = this.rowPopoverTargetWritable.asReadonly();
    readonly isOpen = xcomputed([this.hostRef], hostRef => hostRef !== null);

    async open<T>(component: Type<T>, onClose?: () => void): Promise<ComponentRef<T>> {
        await this.close();
        const hostRef = createComponent(Popover, { environmentInjector: this.injector });
        document.body.appendChild(hostRef.location.nativeElement);
        this.appRef.attachView(hostRef.hostView);
        hostRef.instance.onClose.subscribe(() => {
            void this.close();
            onClose?.();
        });
        const contentRef = hostRef.instance.loadComponent(component, this.injector);
        this.hostRef.set(hostRef);
        return contentRef;
    }

    async close() {
        const hostRef = this.hostRef();
        if (!hostRef) return;
        await hostRef.instance.close();
        this.appRef.detachView(hostRef.hostView);
        hostRef.destroy();
        this.hostRef.set(null);
        this.openedRowPopover.set(null);
    }

    bindRowPopoverRoute(route: ActivatedRoute): Subscription {
        return route.queryParamMap.subscribe(queryParams => {
            void this.syncRowPopoverFromQuery(route, queryParams);
        });
    }

    getRowPopoverUrl(route: ActivatedRoute, tableName: TableName, id: number): UrlTree;
    getRowPopoverUrl(route: ActivatedRoute, target: null): UrlTree;
    getRowPopoverUrl(route: ActivatedRoute, tableNameOrTarget: TableName | null, id?: number): UrlTree {
        if (tableNameOrTarget == null)
            return this.router.createUrlTree([], {
                relativeTo: route,
                queryParams: { popover: null, id: null, itemType: null },
                queryParamsHandling: 'merge',
            });
        if (!Number.isInteger(id) || id! <= 0)
            throw new Error(`Invalid popover row id: ${id}`);
        return this.router.createUrlTree([], {
            relativeTo: route,
            queryParams: { popover: tableNameOrTarget, id },
            queryParamsHandling: 'merge',
        });
    }

    async openRowPopoverInQuery(route: ActivatedRoute, tableName: TableName, id: number) {
        await this.router.navigateByUrl(this.getRowPopoverUrl(route, tableName, id), { replaceUrl: true });
    }

    async clearRowPopoverQuery(route: ActivatedRoute, replaceUrl = true) {
        await this.router.navigateByUrl(this.getRowPopoverUrl(route, null), { replaceUrl });
    }

    async toggleRowPopoverInQuery(route: ActivatedRoute, tableName: TableName, id: number) {
        const currentTarget = this.parseRowPopoverQuery(route.snapshot.queryParamMap);
        if (this.isSameTarget(currentTarget, { tableName, id })) {
            await this.clearRowPopoverQuery(route);
            return;
        }
        await this.openRowPopoverInQuery(route, tableName, id);
    }

    private async syncRowPopoverFromQuery(route: ActivatedRoute, queryParams: ParamMap) {
        const target = this.parseRowPopoverQuery(queryParams);
        this.rowPopoverTargetWritable.set(target);

        const token = ++this.syncToken;
        if (!target) {
            await this.close();
            return;
        }

        if (this.isSameTarget(this.openedRowPopover(), target))
            return;

        const component = await this.getRowPopoverComponent(target.tableName);
        if (token !== this.syncToken)
            return;
        if (!component) {
            console.error(`[PopoverService] No popover page component is registered for table '${target.tableName}'.`);
            await this.clearRowPopoverQuery(route, true);
            return;
        }

        const contentRef = await this.open(component,
            () => void this.clearRowPopoverQuery(route, true));
        if (token !== this.syncToken)
            return;

        const instance = contentRef.instance as object;
        if (!this.hasPopoverRowIdSetter(instance)) {
            console.error(`[PopoverService] Popover component for table '${target.tableName}' does not implement setPopoverRowId(id).`);
            await this.clearRowPopoverQuery(route, true);
            return;
        }
        await instance.setPopoverRowId(target.id);
        if (token !== this.syncToken)
            return;

        this.openedRowPopover.set(target);
    }

    private parseRowPopoverQuery(queryParams: ParamMap): RowPopoverTarget | null {
        const tableName = queryParams.get('popover');
        if (!tableName)
            return null;
        const id = Number(queryParams.get('id'));
        if (!Number.isInteger(id) || id <= 0)
            return null;
        return { tableName: tableName as TableName, id };
    }

    private isSameTarget(left: RowPopoverTarget | null, right: RowPopoverTarget | null): boolean {
        return left?.tableName === right?.tableName
            && left?.id === right?.id;
    }

    private hasPopoverRowIdSetter(instance: object): instance is RowPopoverPage {
        return 'setPopoverRowId' in instance
            && typeof instance.setPopoverRowId === 'function';
    }

    private async getRowPopoverComponent(tableName: TableName): Promise<Type<object> | null> {
        switch (tableName) {
            case 'member':
                return (await import('@/private/members/member-page')).MemberPage;
            case 'profile':
                return (await import('@/private/users/user-page')).UserPage;
            case 'organization':
                return (await import('@/private/callings/organizations/organization-page')).OrganizationPage;
            case 'member_calling':
                return (await import('@/private/member-calling/member-calling-page')).MemberCallingPage;
            case 'agenda':
                return (await import('@/private/meetings/agenda/agenda-page')).AgendaPage;
            case 'agenda_item':
                return (await import('@/private/meetings/agenda/item/agenda-item-page')).AgendaItemPage;
            case 'sacrament_meeting':
                return (await import('@/private/sacrament-meeting/planning/sacrament-meeting-page')).SacramentMeetingPage;
            case 'message':
                return (await import('@/private/sacrament-meeting/planning/item/message-page')).MessagePage;
            case 'hymn':
                return (await import('@/private/sacrament-meeting/planning/item/hymn-page')).HymnPage;
            case 'musical_performance':
                return (await import('@/private/sacrament-meeting/planning/item/musical-performance-page')).MusicalPerformancePage;
            default:
                return null;
        }
    }

    async confirm(title: string, message: string, confirm: string, cancelText: string): Promise<boolean> {
        return new Promise<boolean>(async resolve => {
            const confirmPopoverRef = await this.open(ConfirmPopover, () => resolve(false));
            const confirmPopover = confirmPopoverRef.instance;
            confirmPopover.title.set(title);
            confirmPopover.message.set(message);
            confirmPopover.confirmText.set(confirm);
            confirmPopover.cancelText.set(cancelText);
            confirmPopover.callback = async (confirmed: boolean) => {
                resolve(confirmed);
                await this.close();
            };
        });
    }
}
