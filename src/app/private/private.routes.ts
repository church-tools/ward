import { AppComponent } from "../app.component";
import { Icon } from "../shared/icon/icon";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";
import { PrivatePageComponent } from "./shared/private-page";

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
            ':agenda_item': {
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
        }
    },
    callings: {
        translateId: 'CALLINGS', icon: 'briefcase',
        loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent)
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
