import { Routes } from "@angular/router";
import { PublicShellComponent } from "./shell/public-shell";

export const publicRoutes: Routes = [{ 
    path: '', 
    component: PublicShellComponent, 
    children: [
        { path: 'login', loadComponent: () => import('./login-page').then(m => m.LoginPageComponent) },
        { path: 'setup', loadComponent: () => import('./setup/setup-page').then(m => m.SetupPageComponent) },
        { path: 'not-found', loadComponent: () => import('./not-found-page').then(m => m.NotFoundPageComponent) },
        { path: '', redirectTo: 'login', pathMatch: 'full' },
        { path: '**', redirectTo: 'not-found' }
    ],
    pathMatch: 'prefix' 
}];
