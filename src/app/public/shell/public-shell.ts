import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import MenuButtonComponent, { MenuButtonItem } from '../../shared/form/button/menu/menu-button';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { ShellComponent } from '../../shared/shell/shell';
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './public-shell.scss'],
    imports: [TranslateModule, PageRouterOutlet, MenuButtonComponent],
})
export class PublicShellComponent extends ShellComponent {

    private readonly router = inject(Router);

    
    protected readonly menuItems = xcomputed([this.supabase.user], user => {
        return [user
            ? <MenuButtonItem>{
                labelTranslateId: 'SIGN_OUT',
                icon: 'sign_out',
                action: async () => {
                    await this.supabase.signOut();
                    this.router.navigate(['/login']);
                }
            }
            : <MenuButtonItem>{
                labelTranslateId: 'SIGN_IN',
                icon: 'door_arrow_right',
                action: async () => {
                    this.router.navigate(['/login']);
                }
            }];
    });
    
}