import { ActivatedRouteSnapshot, RouterStateSnapshot, Routes } from '@angular/router';
import { AppComponent } from './app.component';

export const routes: Routes = [
    { path: '', canActivate: [hasUnit], loadChildren: () => import('./private/private.routes').then(m => m.getPrivateRoutes()) },
    { path: '', loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes) },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];

async function hasUnit(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const session = await AppComponent.supabase?.getSession();
    if (!session) {
        window.location.href = '/login';
        return false;
    }
    if (!session.unit) {
        window.location.href = '/setup';
        return false;
    }
    return true;
}