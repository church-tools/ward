import { Routes } from "@angular/router";
import { mapRouteObject, RouteObject } from "@/shared/utils/route-utils";

export const publicTabs: RouteObject = {
    login: { loadComponent: () => import('./login-page').then(m => m.LoginPage) },
    register: { loadComponent: () => import('./register-page').then(m => m.RegisterPage) },
    'request-password-reset': { loadComponent: () => import('./forgot-password-page').then(m => m.ForgotPasswordPage) },
    'reset-password': { loadComponent: () => import('./reset-password-page').then(m => m.ResetPasswordPage) },
    join: { loadComponent: () => import('./join-page').then(m => m.JoinPage) },
    setup: {
        pending: { loadComponent: () => import('./setup/setup-pending-page').then(m => m.SetupPendingPage) },
        rejected: { loadComponent: () => import('./setup/setup-rejected-page').then(m => m.SetupRejectedPage) },
        loadComponent: () => import('./setup/setup-page').then(m => m.SetupPage),
    },
    test: { loadComponent: () => import('./test-page').then(m => m.Test) },
    'test-emails': { loadComponent: () => import('./test-emails-page').then(m => m.TestEmailsPage) },
    'confirm-email': { loadComponent: () => import('./confirm-email').then(m => m.ConfirmEmailPage) },
    'bulletin-board': { loadComponent: () => import('./bulletin-board/bulletin-board-page').then(m => m.BulletinBoardPage) },
};

export const publicRoutes: Routes = [{ 
    path: '', 
    loadComponent: () => import('./shell/public-shell').then(m => m.PublicShell),
    children: [
        ...mapRouteObject(publicTabs),
        localStorage.getItem('BULLETIN_BOARD_KEY')
            ? { path: '', redirectTo: 'bulletin-board', pathMatch: 'full' }
            : { path: '', redirectTo: 'login', pathMatch: 'full' },
        { path: '**', loadComponent: () => import('./not-found-page').then(m => m.NotFoundPage) }
    ],
    pathMatch: 'prefix' 
}];
