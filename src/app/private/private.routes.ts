import { Routes } from "@angular/router";
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
        loadComponent: () => import('./members-page').then(m => m.MembersPageComponent)
    },
    callings: {
        translateId: 'CALLINGS', icon: 'briefcase',
        loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent)
    },
    churchService: {
        translateId: 'CHURCH_SERVICE', icon: 'presenter',
        loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent)
    },
};

export const privateRoutes: Routes = [{
    path: '', 
    loadComponent: () => import('./shell/private-shell').then(m => m.PrivateShellComponent), 
    children: mapRouteObject(privateTabs),
}];
