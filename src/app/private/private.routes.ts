import { AppComponent } from "../app.component";
import type { Row, TableName } from "../modules/shared/table.types";
import type { Icon } from "../shared/icon/icon";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";
import type { PrivatePageComponent } from "./shared/private-page";

export type PrivateTab = RouteObject<PrivatePageComponent> & {
    translateId: string;
    icon: Icon;
    onBottom?: boolean;
};

export const privateTabs: { [path: string]: PrivateTab } = {
    meetings: {
        translateId: 'MEETINGS', icon: 'comment_checkmark',
        loadComponent: () => import('./meetings/meetings-page').then(m => m.MeetingsPageComponent),
        ':agenda_item': {
            insideParent: true,
            loadComponent: () => import('./meetings/agenda/item/agenda-item-page').then(m => m.AgendaItemPageComponent),
        },
        'agenda/:agenda': {
            loadComponent: () => import('./meetings/agenda/agenda-page').then(m => m.AgendaPageComponent),
            settings: {
                insideParent: true,
                loadComponent: () => import('./meetings/agenda/settings/agenda-settings-page').then(m => m.AgendaSettingsPageComponent),
            },
            'item/:agenda_item': {
                insideParent: true,
                loadComponent: () => import('./meetings/agenda/item/agenda-item-page').then(m => m.AgendaItemPageComponent),
            }
        },
    },
    members: {
        translateId: 'MEMBERS', icon: 'people_community',
        loadComponent: () => import('./members/members-page').then(m => m.MembersPageComponent),
        ':member': {
            insideParent: true,
            loadComponent: () => import('./members/member-page').then(m => m.MemberPageComponent),
        },
    },
    callings: {
        translateId: 'CALLINGS', icon: 'briefcase',
        loadComponent: () => import('./callings/callings-page').then(m => m.CallingsPageComponent),
        organizations: {
            loadComponent: () => import('./callings/organizations/organizations-page').then(m => m.OrganizationsPageComponent),
            ':organization': {
                insideParent: true,
                loadComponent: () => import('./callings/organizations/organization-page').then(m => m.OrganizationPageComponent),
            }
        },
    },
    'church-service': {
        translateId: 'CHURCH_SERVICE', icon: 'presenter',
        loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent)
    },
    users: {
        admin: true, onBottom: true,
        translateId: 'USERS', icon: 'person',
        loadComponent: () => import('./users/users-page').then(m => m.UsersPageComponent),
        ':profile': {
            insideParent: true,
            loadComponent: () => import('./users/user-page').then(m => m.UserPageComponent),
        }
    },
};

export async function getPrivateRoutes() {
    const session = await AppComponent.supabase?.getSession();
    return [{
        path: '',
        loadComponent: () => import('./shell/private-shell').then(m => m.PrivateShellComponent), 
        children: mapRouteObject(privateTabs, session?.is_admin),
    }];
}

export type TableRow = { [T in TableName]: { table: T, row: Row<T> } }[TableName];

export function getRowRoute(tableRow: TableRow): string {
    const { table, row } = tableRow;
    switch (table) {
        case 'member': return `/members/${row.id}`;
        case 'agenda': return `/meetings/agenda/${row.id}`;
        case 'agenda_item': return `/meetings/agenda/${row.agenda}/item/${row.id}`;
        case 'organization': return `/callings/organizations/${row.id}`;
    }
    throw new Error(`No route defined for table ${table}`);
}