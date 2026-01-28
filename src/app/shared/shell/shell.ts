import { AfterViewInit, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../modules/profile/profile.service';
import MenuButtonComponent from '../form/button/menu/menu-button';
import { SupabaseService } from '../service/supabase.service';
import { WindowService } from '../service/window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused() || windowService.mobileOS',
        '[class.dense]': '!windowService.isLarge()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly profileService = inject(ProfileService);
    protected readonly windowService = inject(WindowService);
    protected readonly supabase = inject(SupabaseService);
    protected readonly router = inject(Router);

    protected readonly menuButton = viewChild.required(MenuButtonComponent);

    constructor() {
        this.windowService.setTitleBarColor({
            focused: { light: '#cedad8', dark: '#172825' },
            unfocused: { light: '#e8e8e8', dark: '#272727' }
        });
    }

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }

    protected signOut = async () => {
        this.menuButton().execute();
        await this.supabase.signOut();
        this.router.navigate(['/login']);
    }
}