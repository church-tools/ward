import { Routes } from '@angular/router';
import { privateRoutes } from './pages/private/private.routes';
import { PrivateShellComponent } from './pages/private/shell/private-shell';
import { publicRoutes } from './pages/public/public.routes';
import { PublicShellComponent } from './pages/public/shell/public-shell';

export const routes: Routes = [
    { path: '', component: PrivateShellComponent, children: privateRoutes, pathMatch: 'prefix' },
    { path: '', component: PublicShellComponent, children: publicRoutes, pathMatch: 'prefix' },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];
