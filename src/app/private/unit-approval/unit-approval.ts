
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SupabaseService } from '../../shared/service/supabase.service';
import { PrivatePageComponent } from '../shared/private-page';
import { asyncComputed } from '../../shared/utils/signal-utils';
import { IconComponent } from "../../shared/icon/icon";

@Component({
    selector: 'app-unit-approval-page',
    template: `
        <span class="h0">{{ 'UNIT_APPROVAL_PAGE.TITLE' | translate }}</span>
        <p>Callings component content goes here.</p>
        @if (units() == null) {+
            <app-icon icon="throbber"/>
        } @else {
            @if (units()!.length) {
                @for (unit of units(); track unit.id) {
                    {{ unit.name }} - {{ unit.created_by }}<br>
                }
            } @else {
                Alles erledigt!
            }
        }
    `,
    imports: [TranslateModule, IconComponent],
    host: { class: 'page narrow' },
})
export class UnitApprovalPageComponent extends PrivatePageComponent {

    private readonly supabase = inject(SupabaseService);

    protected readonly units = asyncComputed([], async () => {
        const data = await this.supabase.callEdgeFunction('fetch-unapproved-units');
        return data.units as { id: number; name: string, created_by: string }[];
    });

}