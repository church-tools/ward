import { Component, inject } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Icon } from '../../shared/icon/icon';
import { Page } from '../../shared/page/page';
import LinkButton from '@/shared/form/button/link/link-button';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { SupabaseService } from '@/shared/service/supabase.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-setup-pending-page',
    template: `
        <span class="display-text text-center">{{ 'SETUP_PENDING.TITLE' | localize }}</span>
        <p class="text-center">{{ 'SETUP_PENDING.MESSAGE' | localize }}</p>
        <div class="row center-content mt-8">
            <app-icon icon="hourglass_half" size="xxxxl" class="accent-text"/>
        </div>
        <div class="row center-content mt-8">
            <app-async-button [onClick]="recheck" size="large" icon="arrow_clockwise">
                {{ 'SETUP_PENDING.RECHECK' | localize }}
            </app-async-button>
        </div>
    `,
    imports: [Icon, LocalizePipe, AsyncButton],
    host: { class: 'page portrait' },
})
export class SetupPendingPage extends Page {

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