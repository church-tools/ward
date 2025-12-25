import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon';
import { PageComponent } from '../../shared/page/page';
import LinkButtonComponent from '../../shared/form/button/link/link-button';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import { SupabaseService } from '../../shared/service/supabase.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-setup-pending-page',
    template: `
        <span class="display-text text-center">{{ 'SETUP_PENDING.TITLE' | translate }}</span>
        <p class="text-center">{{ 'SETUP_PENDING.MESSAGE' | translate }}</p>
        <div class="row center-content mt-8">
            <app-icon icon="hourglass_half" size="xxxxl" class="accent-text"/>
        </div>
        <div class="row center-content mt-8">
            <app-async-button [onClick]="recheck" size="large" icon="arrow_clockwise">
                {{ 'SETUP_PENDING.RECHECK' | translate }}
            </app-async-button>
        </div>
    `,
    imports: [IconComponent, TranslateModule, AsyncButtonComponent],
    host: { class: 'page portrait' },
})
export class SetupPendingPageComponent extends PageComponent {

    private readonly supabase = inject(SupabaseService);
    private readonly router = inject(Router);

    protected recheck = async () => {
        await this.supabase.refreshSession();
        const session = await this.supabase.getSession();
        if (session?.unit) {
            this.router.navigateByUrl('/');
        } else if (session?.unit_approved === false) {
            this.router.navigateByUrl('/setup/rejected');
        }
        throw 'SETUP_PENDING.STILL_PENDING';
    }
}