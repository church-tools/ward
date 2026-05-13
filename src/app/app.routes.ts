import { CanMatchFn, Router, Routes, UrlTree, UrlSegment } from '@angular/router';
import { SupabaseService } from './shared/service/supabase.service';
import { inject } from '@angular/core';

const PUBLIC_ROOT_PATHS = new Set([
    'login',
    'register',
    'reset-password',
    'join',
    'setup',
    'test',
    'test-emails',
    'confirm-email',
    'bulletin-board',
]);

const hasUnit: CanMatchFn = async (_route, segments) => {
    const router = inject(Router);
    const session = await inject(SupabaseService).getSession();

    const currentPath = getPath(segments);
    const firstSegment = segments[0]?.path;

    if (firstSegment === 'join') {
        if (session?.unit)
            return router.parseUrl('/');
        return false;
    }

    if (!session) {
        if (firstSegment && PUBLIC_ROOT_PATHS.has(firstSegment))
            return false;
        return router.parseUrl('/login');
    }

    if (session.unit) {
        return true;
    }

    if (session.unit_approved === false)
        return ensureRedirect('/setup/rejected', currentPath, router);
    if (session.unit_approved === null)
        return ensureRedirect('/setup/pending', currentPath, router);

    return ensureRedirect('/setup', currentPath, router);
};

function ensureRedirect(target: string, currentPath: string, router: Router): false | UrlTree {
    if (currentPath === target || currentPath.startsWith(`${target}/`))
        return false;
    return router.parseUrl(target);
}

function getPath(segments: UrlSegment[]) {
    if (!segments.length)
        return '/';
    return `/${segments.map(s => s.path).join('/')}`;
}

export const routes: Routes = [
    { path: '', canMatch: [hasUnit], loadChildren: () => import('./private/private.routes').then(m => m.getPrivateRoutes()) },
    { path: '', loadChildren: () => import('./public/public.routes').then(m => m.publicRoutes) },
];
