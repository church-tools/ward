import { Routes } from "@angular/router";
import { mapRouteObject, RouteObject } from "../shared/utils/route-utils";

export const publicTabs: RouteObject = {
    login: { loadComponent: () => import('./login-page').then(m => m.LoginPageComponent) },
    register: { loadComponent: () => import('./register-page').then(m => m.RegisterPageComponent) },
    setup: {
        pending: { loadComponent: () => import('./setup/setup-pending-page').then(m => m.SetupPendingPageComponent) },
        rejected: { loadComponent: () => import('./setup/setup-rejected-page').then(m => m.SetupRejectedPageComponent) },
        loadComponent: () => import('./setup/setup-page').then(m => m.SetupPageComponent),
    },
    test: { loadComponent: () => import('./test-page').then(m => m.TestComponent) },
    'not-found': { loadComponent: () => import('./not-found-page').then(m => m.NotFoundPageComponent) },
    'confirm-email': { loadComponent: () => import('./confirm-email').then(m => m.ConfirmEmailPageComponent) },
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
