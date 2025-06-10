import { Routes } from "@angular/router";
import { PrivateShellComponent } from "./shell/private-shell";
import { Type } from "@angular/core";
import { PageComponent } from "../shared/page";

export type PrivateTab = { path: string; label: string; icon: string; loadComponent: () => Promise<Type<PageComponent>> };
    
export const privateTabs: PrivateTab[] = [
    { path: 'meetings', label: 'Sitzungen', icon: 'people_audience', loadComponent: () => import('./meetings-page').then(m => m.MeetingsPageComponent) },
    { path: 'service', label: 'Gottesdienst', icon: 'presenter', loadComponent: () => import('./service-page').then(m => m.ServicePageComponent) },
];

export const privateRoutes: Routes = [
    { 
        path: '', 
        component: PrivateShellComponent, 
        children: privateTabs.map(({ path, loadComponent }) => ({ path, loadComponent })),
        pathMatch: 'prefix' 
    },
];
