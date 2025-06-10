import { Type } from "@angular/core";
import { Routes } from "@angular/router";
import { PageComponent } from "../shared/page";
import { PrivateShellComponent } from "./shell/private-shell";

export type PrivateTab = { path: string; label: string; icon: string; loadComponent: () => Promise<Type<PageComponent>> };
    
export const privateTabs: PrivateTab[] = [
    { path: 'meetings', label: 'Sitzungen', icon: 'people_audience', loadComponent: () => import('./meetings-page').then(m => m.MeetingsPageComponent) },
    { path: 'members', label: 'Mitglieder', icon: 'people_community', loadComponent: () => import('./members-page').then(m => m.MembersPageComponent) },
    { path: 'callings', label: 'Berufungen', icon: 'briefcase', loadComponent: () => import('./callings-page').then(m => m.CallingsPageComponent) },
    { path: 'church-service', label: 'Gottesdienst', icon: 'presenter', loadComponent: () => import('./church-service-page').then(m => m.ChurchServicePageComponent) },
];

export const privateRoutes: Routes = [
    { 
        path: '', 
        component: PrivateShellComponent, 
        children: privateTabs.map(({ path, loadComponent }) => ({ path, loadComponent })),
        pathMatch: 'prefix' 
    },
];
