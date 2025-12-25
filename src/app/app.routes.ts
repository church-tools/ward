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
    if (!('unit' in session || 'unit_approved' in session)) {
        window.location.href = '/setup';
        return false;
    }
    if (session.unit) {
        return true;
    }
    if ('unit_approved' in session) {
        if (session.unit_approved === false)
            window.location.href = '/setup/rejected';
        if (session.unit_approved === null)
            window.location.href = '/setup/pending';
        return false;
    }
    return false;
}