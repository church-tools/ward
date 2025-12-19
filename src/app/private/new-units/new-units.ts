
import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SupabaseService } from '../../shared/service/supabase.service';
import { PrivatePageComponent } from '../shared/private-page';
import { IconComponent } from "../../shared/icon/icon";
import AsyncButtonComponent from '../../shared/form/button/async/async-button';

type UnitInfo = { id: number; name: string, created_by: string }

@Component({
    selector: 'app-unit-approval-page',
    template: `
        <span class="h0">{{ 'NEW_UNITS_PAGE.TITLE' | translate }}</span>
        @if (units() == null) {
            <div class="column items-center center-content height-64">
                <app-icon icon="throbber"/>
            </div>
        } @else {
            @if (units()!.length) {
                @for (unit of units(); track unit.id) {
                    <div class="card canvas-card">
                        <div class="card-body row spread-content">
                            <div class="column">
                                {{ unit.name }}<br>
                                <span class="small-text muted-text">{{ unit.created_by }}</span>
                            </div>
                            <div class="row gap-4">
                                <app-async-button type="primary"
                                    icon="checkmark" class="icon-only"
                                    [onClick]="setUnitApproved(unit.id, true)"/>
                                <app-async-button type="secondary"
                                    icon="dismiss" class="icon-only"
                                    [onClick]="setUnitApproved(unit.id, false)"/>
                            </div>
                        </div>
                    </div>
                }
            } @else {
                <div class="column gap-4 items-center center-content height-64 card-appear">
                    <app-icon icon="checkmark_circle" size="xxxxl" class="accent-text"/>
                    Alles erledigt!
                </div>
            }
        }
    `,
    imports: [TranslateModule, IconComponent, AsyncButtonComponent],
    host: { class: 'page narrow' },
})
export class NewUnitsPageComponent extends PrivatePageComponent {

    private readonly supabase = inject(SupabaseService);

    protected readonly units = signal<UnitInfo[] | null>(null);

    async ngOnInit() {
        const data = await this.supabase.callEdgeFunction('fetch-unapproved-units');
        this.units.set(data.units);
    }

    protected setUnitApproved(unit_id: number, approved: boolean) {
        return async () => {
            await this.supabase.callEdgeFunction('set-unit-approved', { unit_id, approved });
            this.units.update(units => units?.filter(u => u.id !== unit_id) ?? null);
        }
    }
}