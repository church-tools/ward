import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PageComponent } from "../shared/page/page";

export type PublicTab = {
    loadComponent: () => Promise<Type<PageComponent>>;
    children?: { [path: string]: Omit<Route, 'path'> };
};

export const publicTabs: { [path: string]: PublicTab } = {
    login: { loadComponent: () => import('./login-page').then(m => m.LoginPageComponent) },
    setup: { loadComponent: () => import('./setup/setup-page').then(m => m.SetupPageComponent) },
    'not-found': { loadComponent: () => import('./not-found-page').then(m => m.NotFoundPageComponent) },
};

export const publicRoutes: Routes = [{ 
    path: '', 
    loadComponent: () => import('./shell/public-shell').then(m => m.PublicShellComponent),
    children: [
        ...Object.entries(publicTabs).map(([path, { loadComponent, children }]) => ({
            path,
            loadComponent,
            children: Object.entries(children ?? {}).map(([childPath, { loadComponent }]) => ({
                path: childPath,
                loadComponent
            }))
        })),
        { path: '', redirectTo: 'login', pathMatch: 'full' },
        { path: '**', redirectTo: 'not-found' }
    ],
    pathMatch: 'prefix' 
}];
