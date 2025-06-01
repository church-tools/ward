import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { ShellComponent } from './pages/user/shell/shell';
import { userRoutes } from './pages/user/user.routes';

export const routes: Routes = [
    { path: '', component: ShellComponent, children: userRoutes, pathMatch: 'prefix' },
    { path: '', redirectTo: '/data', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

];
