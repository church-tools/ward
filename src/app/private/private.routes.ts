import type { Row, TableName } from "@/modules/shared/table.types";
import type { IconCode } from "@/shared/icon/icon";
import { SupabaseService } from "@/shared/service/supabase.service";
import { mapRouteObject, RouteObject } from "@/shared/utils/route-utils";
import type { PrivatePage } from "./shared/private-page";

export type PrivateTab = RouteObject<PrivatePage> & {
    labelKey: string;
    icon: IconCode;
    onBottom?: boolean;
};

export const privateTabs: { [path: string]: PrivateTab } = {
    meetings: {
        labelKey: 'MEETINGS', icon: 'comment_checkmark',
        loadComponent: () => import('./meetings/meetings-page').then(m => m.MeetingsPage),
        ':agenda_item': {
            insideParent: true,
            loadComponent: () => import('./meetings/agenda/item/agenda-item-page').then(m => m.AgendaItemPage),
        },
        'agenda/:agenda': {
            loadComponent: () => import('./meetings/agenda/agenda-page').then(m => m.AgendaPage),
            settings: {
                insideParent: true,
                loadComponent: () => import('./meetings/agenda/settings/agenda-settings-page').then(m => m.AgendaSettingsPage),
            },
            'item/:agenda_item': {
                insideParent: true,
                loadComponent: () => import('./meetings/agenda/item/agenda-item-page').then(m => m.AgendaItemPage),
            }
        },
    },
    members: {
        labelKey: 'MEMBERS', icon: 'people_community',
        loadComponent: () => import('./members/members-page').then(m => m.MembersPage),
        'import': {
            insideParent: true,
            loadComponent: () => import('./members/import/members-import-page').then(m => m.MembersImportPage),
        },
        ':member': {
            insideParent: true,
            loadComponent: () => import('./members/member-page').then(m => m.MemberPage),
        },
    },
    callings: {
        labelKey: 'CALLINGS', icon: 'briefcase',
        loadComponent: () => import('./callings/callings-page').then(m => m.CallingsPage),
        organizations: {
            loadComponent: () => import('./callings/organizations/organizations-page').then(m => m.OrganizationsPage),
            'settings/:organization': {
                insideParent: true,
                loadComponent: () => import('./callings/organizations/organization-page').then(m => m.OrganizationPage),
            },
            'member-calling/:member_calling': {
                insideParent: true,
                loadComponent: () => import('./member-calling/member-calling-page').then(m => m.MemberCallingPage),
            }
        },
        'member-calling/:member_calling': {
            insideParent: true,
            loadComponent: () => import('./member-calling/member-calling-page').then(m => m.MemberCallingPage),
        }
    },
    'sacrament-meeting': {
        labelKey: 'SACRAMENT_MEETING', icon: 'presenter',
        loadComponent: () => import('./sacrament-meeting/current-sacrament-meeting-page').then(m => m.CurrentSacramentMeetingPage),
        planning: {
            loadComponent: () => import('./sacrament-meeting/planning/sacrament-meeting-planning-page').then(m => m.SacramentMeetingPlanningPage),
            'message/:message': {
                insideParent: true,
                loadComponent: () => import('./sacrament-meeting/planning/item/message-page').then(m => m.MessagePage),
            },
            'fixed-hymn/:slot_and_sacrament_meeting': {
                insideParent: true,
                loadComponent: () => import('./sacrament-meeting/planning/item/fixed-hymn-page').then(m => m.FixedHymnPage),
            },
            'hymn/:hymn': {
                insideParent: true,
                loadComponent: () => import('./sacrament-meeting/planning/item/hymn-page').then(m => m.HymnPage),
            },
            'musical-performance/:musical_performance': {
                insideParent: true,
                loadComponent: () => import('./sacrament-meeting/planning/item/musical-performance-page').then(m => m.MusicalPerformancePage),
            },
            ':sacrament_meeting': {
                insideParent: true,
                loadComponent: () => import('./sacrament-meeting/planning/sacrament-meeting-page').then(m => m.SacramentMeetingPage),
            },
        },
    },
    users: {
        admin: true, onBottom: true,
        labelKey: 'USERS', icon: 'person',
        loadComponent: () => import('./users/users-page').then(m => m.UsersPage),
        'create-join-link': {
            insideParent: true,
            loadComponent: () => import('./users/create-join-link-page').then(m => m.CreateJoinLinkPage),
        },
        ':profile': {
            insideParent: true,
            loadComponent: () => import('./users/user-page').then(m => m.UserPage),
        }
    },
};

export async function getPrivateRoutes() {
    const session = await SupabaseService.instance?.getSession();
    return [{
        path: '',
        loadComponent: () => import('./shell/private-shell').then(m => m.PrivateShell), 
        children: mapRouteObject(privateTabs, session?.is_admin),
    }];
}

export type TableRow = { [T in TableName]: {
    table: T,
    row: Row<T>,
    currentPage?: 'CallingsPage' | 'OrganizationsPage' | 'MeetingsPage'
} }[TableName];

export function getRowRoute(tableRow: TableRow): string {
    const { table, row, currentPage } = tableRow;
    switch (table) {
        case 'member': return `/members/${row.id}`;
        case 'agenda': return `/meetings/agenda/${row.id}`;
        case 'agenda_item':
            switch (currentPage) {
                case 'MeetingsPage':
                    return `/meetings/${row.id}`;
                default:
                    return `/meetings/agenda/${row.agenda}/item/${row.id}`;
            }
        case 'organization': return `/callings/organizations/settings/${row.id}`;
        case 'member_calling':
            switch (currentPage) {
                case 'CallingsPage':
                    return `/callings/member-calling/${row.id}`;
                case 'OrganizationsPage':
                default:
                    return `/callings/organizations/member-calling/${row.id}`;
            }
        case 'sacrament_meeting': return `/sacrament-meeting/planning/${row.id}`;
        case 'message': return `/sacrament-meeting/planning/message/${row.id}`;
        case 'hymn': return `/sacrament-meeting/planning/hymn/${row.id}`;
        case 'musical_performance': return `/sacrament-meeting/planning/musical-performance/${row.id}`;

    }
    throw new Error(`No route defined for table ${table}`);
}