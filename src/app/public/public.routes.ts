import { Routes } from "@angular/router";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";

export const publicTabs: RouteObject = {
    login: { loadComponent: () => import('./login-page').then(m => m.LoginPageComponent) },
    setup: { loadComponent: () => import('./setup/setup-page').then(m => m.SetupPageComponent) },
    'not-found': { loadComponent: () => import('./not-found-page').then(m => m.NotFoundPageComponent) },
};

export const publicRoutes: Routes = [{ 
    path: '', 
    loadComponent: () => import('./shell/public-shell').then(m => m.PublicShellComponent),
    children: [
        ...mapRouteObject(publicTabs),
        { path: '', redirectTo: 'login', pathMatch: 'full' },
        { path: '**', redirectTo: 'not-found' }
    ],
    pathMatch: 'prefix' 
}];
