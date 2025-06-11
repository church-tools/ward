import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', loadChildren: () => import('./private/private.routes').then(m => m.privateRoutes) },
    { path: '', loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes) },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];
