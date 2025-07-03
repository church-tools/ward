import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PrivatePageComponent } from "./shared/private-page";

type PrivateRoute = {
    loadComponent: () => Promise<Type<PrivatePageComponent>>;
    childrenInside?: boolean; // If true, the component will be displayed when children are loaded
} | { [childPath: string]: PrivateRoute };

export type PrivateTab = PrivateRoute & {
    label: string;
    icon: string;
};

export const privateTabs: { [path: string]: PrivateTab } = {
    meetings: {
        label: 'Sitzungen', icon: 'people_audience',
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
    children: mapRoutes(privateTabs),
}];

function mapRoutes(routes?: { [path: string]: PrivateRoute }): Routes {
    return Object.entries(routes ?? {})
        .filter(([, { loadComponent }]) => !!loadComponent)
        .map(([path, { loadComponent, childrenInside, ...children }]) => <Route>{
            path,
            loadComponent,
            data: { animation: path },
            pathMatch: childrenInside ? 'prefix' : 'full',
            children: mapRoutes(children),
        });
}
