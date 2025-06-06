import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', loadChildren: () => import('./pages/private/private.routes').then(m => m.privateRoutes) },
    { path: '', loadChildren: () => import('./pages/public/public.routes').then(m => m.publicRoutes) },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];
