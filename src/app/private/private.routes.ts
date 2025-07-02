import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PrivatePageComponent } from "./shared/private-page";
import { PrivateShellComponent } from "./shell/private-shell";

export type PrivateTab = {
    path: string;
    label: string;
    icon: string;
    loadComponent: () => Promise<Type<PrivatePageComponent>>;
    children?: Route[];
};
    
export const privateTabs: PrivateTab[] = [
    { path: 'meetings', label: 'Sitzungen', icon: 'people_audience', loadComponent: () => import('./meetings-page').then(m => m.MeetingsPageComponent),
        children: [
            { path: ':agenda', loadComponent: () => import('./agenda/agenda-page').then(m => m.AgendaPageComponent) }
        ]
    },
    { path: 'members', label: 'Mitglieder', icon: 'people_community', loadComponent: () => import('./members-page').then(m => m.MembersPageComponent) },
    { path: 'callings', label: 'Berufungen', icon: 'briefcase', loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent) },
    { path: 'church-service', label: 'Gottesdienst', icon: 'presenter', loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent) },
];

export const privateRoutes: Routes = [{ 
    path: '', 
    component: PrivateShellComponent, 
    children: privateTabs.map(({ path, loadComponent, children }) => ({ 
        path, 
        loadComponent,
        data: { animation: path },
        pathMatch: 'full',
        children,
    })),
}];
