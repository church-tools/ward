import { Routes } from "@angular/router";
import { Icon } from "../shared/icon/icon";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";
import { PrivatePageComponent } from "./shared/private-page";

export type PrivateTab = RouteObject<PrivatePageComponent> & {
    label: string;
    icon: Icon;
};

export const privateTabs: { [path: string]: PrivateTab } = {
    meetings: {
        label: 'Sitzungen', icon: 'chat_multiple',
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
        label: 'Mitglieder', icon: 'people_community',
        loadComponent: () => import('./members-page').then(m => m.MembersPageComponent)
    },
    callings: {
        label: 'Berufungen', icon: 'briefcase',
        loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent)
    },
    churchService: {
        label: 'Gottesdienst', icon: 'presenter',
        loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent)
    },
};

export const privateRoutes: Routes = [{
    path: '', 
    loadComponent: () => import('./shell/private-shell').then(m => m.PrivateShellComponent), 
    children: mapRouteObject(privateTabs),
}];
