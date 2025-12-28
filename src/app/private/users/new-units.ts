import { Component, inject, OnInit, signal } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import AsyncButtonComponent from "../../shared/form/button/async/async-button";
import { IconComponent } from "../../shared/icon/icon";
import { SupabaseService } from "../../shared/service/supabase.service";

type UnitInfo = { id: number; name: string, created_by: string };

@Component({
    selector: 'app-new-units',
    template: `
        <h1 class="mt-8">{{ 'USERS_PAGE.NEW_UNITS.TITLE' | translate }}</h1>
        @if (units() == null) {
            <div class="column mt-4 items-center center-content">
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
                <div class="column mt-4 gap-4 items-center center-content card-appear">
                    <app-icon icon="checkmark_circle" size="xxxxl" class="subtle-text"/>
                    {{ 'USERS_PAGE.NEW_UNITS.ALL_DONE' | translate }}
                </div>
            }
        }
    `,
    imports: [TranslateModule, AsyncButtonComponent, IconComponent],
})
export class NewUnitsComponent implements OnInit {
    
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