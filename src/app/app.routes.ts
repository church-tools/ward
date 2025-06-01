import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DataPageComponent } from './pages/data-page';
import { ShellComponent } from './pages/main/shell';

const userRoutes: Routes = [
    { path: 'data', component: DataPageComponent },
];

export const routes: Routes = [
    { path: '', component: ShellComponent, children: userRoutes, pathMatch: 'prefix' },
    { path: '', redirectTo: '/data', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

];
