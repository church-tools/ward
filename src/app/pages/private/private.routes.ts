import { Routes } from "@angular/router";
import { PrivateShellComponent } from "./shell/private-shell";

export const privateRoutes: Routes = [
    { 
        path: '', 
        component: PrivateShellComponent, 
        children: [
            { path: 'data', loadComponent: () => import('./data-page').then(m => m.DataPageComponent) },
        ],
        pathMatch: 'prefix' 
    },
];
