import { Routes } from "@angular/router";
import { PublicShellComponent } from "./shell/public-shell";

export const publicRoutes: Routes = [{ 
    path: '', 
    component: PublicShellComponent, 
    children: [
        { path: 'login', loadComponent: () => import('./login-page').then(m => m.LoginPageComponent) },
        { path: 'setup', loadComponent: () => import('./setup/setup-page').then(m => m.SetupPageComponent) },
    ],
    pathMatch: 'prefix' 
}];
