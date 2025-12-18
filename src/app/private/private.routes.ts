import { AppComponent } from "../app.component";
import { Icon } from "../shared/icon/icon";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";
import { PrivatePageComponent } from "./shared/private-page";

export type PrivateTab = RouteObject<PrivatePageComponent> & {
    translateId: string;
    icon: Icon;
};

export const privateTabs: { [path: string]: PrivateTab } = {
    meetings: {
        translateId: 'MEETINGS', icon: 'chat_multiple',
        loadComponent: () => import('./meetings/meetings-page').then(m => m.MeetingsPageComponent),
        ':agenda': {
            loadComponent: () => import('./meetings/agenda/agenda-page').then(m => m.AgendaPageComponent),
            childrenInside: true,
            ':task': {
                loadComponent: () => import('./meetings/agenda/task/task-page').then(m => m.TaskPageComponent),
            }
        },
    },
    members: {
        translateId: 'MEMBERS', icon: 'people_community',
        loadComponent: () => import('./members/members-page').then(m => m.MembersPageComponent),
        childrenInside: true,
        ':member': {
            loadComponent: () => import('./members/member-page').then(m => m.MemberPageComponent),
        }
    },
    callings: {
        translateId: 'CALLINGS', icon: 'briefcase',
        loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent)
    },
    churchService: {
        translateId: 'CHURCH_SERVICE', icon: 'presenter',
        loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent)
    },
    unitApproval: {
        admin: true,
        translateId: 'UNIT_APPROVAL', icon: 'checkmark_circle',
        loadComponent: () => import('./unit-approval/unit-approval').then(m => m.UnitApprovalPageComponent)
    }
};

export async function getPrivateRoutes() {
    const session = await AppComponent.supabase?.getSession();
    return [{
        path: '',
        loadComponent: () => import('./shell/private-shell').then(m => m.PrivateShellComponent), 
        children: mapRouteObject(privateTabs, session?.is_admin),
    }];
}
