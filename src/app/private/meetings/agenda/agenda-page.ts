import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AgendaSection } from '../../../modules/agenda/section/agenda-section';
import { AgendaItem } from '../../../modules/item/agenda-item';
import { ProfileService } from '../../../modules/profile/profile.service';
import { RowCardListComponent } from '../../../modules/shared/row-card-list/row-card-list';
import { Table } from '../../../modules/shared/table.types';
import { DbConstants } from '../../../shared/db-constants';
import AsyncButtonComponent from '../../../shared/form/button/async/async-button';
import { IconPickerComponent } from "../../../shared/form/icon-picker/icon-picker";
import { TextInputComponent } from "../../../shared/form/text/text-input";
import { IconComponent } from "../../../shared/icon/icon";
import { DragDropService } from '../../../shared/service/drag-drop.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { SyncedFieldDirective } from "../../../shared/utils/supa-sync/synced-field.directive";
import { DrawerRouterOutletComponent } from "../../shared/drawer-router-outlet/drawer-router-outlet";
import { RowPageComponent } from '../../shared/row-page';
import { AgendaDropZoneComponent } from "./drop-zone/agenda-drop-zone";

@Component({
    selector: 'app-agenda-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateToThis()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                @if (adminService.editMode()) {
                    <div class="row full-width no-wrap">
                        <app-icon-picker [iconOptions]="iconOptions" [filled]="true"
                            [syncedRow]="syncedRow" column="shape"
                            [color]="syncedRow.value()?.color" (colorChange)="syncedRow.write({ color: $event })"
                            class="position-absolute ms--12 mt-3"/>
                        <app-text-input [syncedRow]="syncedRow" column="name" [subtle]="true" textClass="h0" class="full-width"/>
                    </div>
                } @else {
                    <span class="h0">
                        @let row = syncedRow.value();
                        @if (row && row.shape && windowService.isLarge()) {
                            <app-icon [icon]="row.shape" [filled]="true" size="xl"
                                class="{{syncedRow.value()?.color}}-active ms--12"></app-icon>
                        }
                        {{title()}}
                    </span>
                }
                <app-row-card-list #sectionList tableName="agenda_section"
                    [cardsVisible]="adminService.editMode()"
                    [editable]="adminService.editMode()"
                    [getQuery]="sectionQuery()"
                    [gap]="8"
                    [insertContext]="syncedRow"
                    [prepareInsert]="prepareSectionInsert"
                    [page]="this"/>
                @if (adminService.isUnitAdmin() && !adminService.editMode() && sectionList.initialized() && sectionList.rowCount() === 0) {
                    <div class="card canvas-card large card-appear row p-4">
                        <app-async-button icon="edit" size="large"
                            [onClick]="enableEditMode">
                            {{ 'ENABLE_EDIT_MODE' | translate }}
                        </app-async-button>
                    </div> 
                }
            </div>
        </app-drawer-router-outlet>
        <app-agenda-drop-zone [draggedAgendaItem]="draggedAgendaItem()"/>
    `,
    imports: [TranslateModule, RowCardListComponent, DrawerRouterOutletComponent, AgendaDropZoneComponent,
        TextInputComponent, SyncedFieldDirective, IconComponent, IconPickerComponent, AsyncButtonComponent],
    host: { class: 'full-width' },
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    private readonly dragDrop = inject(DragDropService);
    private readonly profileService = inject(ProfileService);
    private readonly itemDragDrop = this.dragDrop.ensureGroup('agenda_item');

    protected readonly sectionQuery = xcomputed([this.syncedRow.value],
        row => row ? { query: (table: Table<'agenda_section'>) => table.find().eq('agenda', row.id), id: `agenda_sections_${row.id}` } : null);
    protected readonly draggedAgendaItem = xcomputed([this.itemDragDrop.dragged],
        drag => drag?.data && 'agenda' in drag.data ? drag : null);

    protected readonly sectionList = viewChild.required<RowCardListComponent<'agenda_section'>>('sectionList');
    
    protected readonly iconOptions = DbConstants.public.Enums.shape;
    protected readonly activeItemId = signal<number | null>(null);
    protected readonly tableName = 'agenda';
    protected readonly dragData = signal<AgendaItem.Row | null>(null);

    protected onActivate(id: string | null) {
        this.activeItemId.set(id ? +id : null);
    }

    protected getItemUrl = (item: AgendaItem.Row) => `/agenda/${item.agenda}/${item.id}`;

    protected prepareSectionInsert = (section: AgendaSection.Insert) => {
        const agenda = this.syncedRow.value();
        if (!agenda) throw new Error("Agenda row is not set");
        section.agenda = +agenda.id;
    }

    protected enableEditMode = async () => {
        const profile = await this.profileService.own.asPromise();
        const agenda = this.syncedRow.value();
        const types: AgendaSection.Type[] = ['prayer', 'spiritual_thought', 'resolutions', 'topics', 'prayer'];
        await this.supabase.sync.from('agenda_section').insert(
            types.map((type, position) => ({ type, position, unit: profile.unit, agenda: +agenda!.id })));
        this.adminService.editMode.set(true);
    }
}
