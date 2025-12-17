import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Routes } from '@angular/router';
import { Session, SupabaseService } from './shared/service/supabase.service';

let session: Session | null = null;

export const routes: Routes = [
    { path: '', canMatch: [hasUnit], loadChildren: () => import('./private/private.routes').then(m => m.getPrivateRoutes(session!)) },
    { path: '', loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes) },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];

async function hasUnit(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const supabase = inject(SupabaseService);
    session = await supabase.getSession();
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