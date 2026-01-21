import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import ButtonComponent from '../../../shared/form/button/button';
import { SupabaseRow, SupabaseService } from '../../../shared/service/supabase.service';
import { asyncComputed } from '../../../shared/utils/signal-utils';
import { Profile } from '../../profile/profile';
import { ListInsertComponent } from '../../shared/list-insert';
import { AgendaSection } from './agenda-section';
import { AgendaSectionViewService } from './agenda-section-view.service';

@Component({
    selector: 'app-agenda-section-list-insert',
    template: `
        <div class="row gap-2 center-content">
            @for (option of options(); track option) {
                <app-button [icon]="option.icon" type="form" size="large"
                    (onClick)="onClick(option.type)">
                    {{ option.label | async }}
                </app-button>
            }
        </div>
    `,
    imports: [ButtonComponent, AsyncPipe],
})
export class AgendaSectionListInsertComponent extends ListInsertComponent<'agenda_section', SupabaseRow<'agenda'>> {

    protected readonly agendaSectionView = inject(AgendaSectionViewService);
    private readonly supabase = inject(SupabaseService);

    private type: AgendaSection.Type | undefined;

    protected readonly options = asyncComputed([this.context], async context => {
        const agenda = context?.value();
        if (!agenda) return [];
        const currentSections = await this.supabase.sync.from('agenda_section').find().eq('agenda', agenda.id).get();
        const existingTypes = new Set(currentSections.map(section => section.type));
        return this.agendaSectionView.typeOptions.filter(option => {
            switch (option.type) {
                case 'suggestions':
                case 'topics':
                case 'resolutions':
                case 'callings':
                    return !existingTypes.has(option.type);
                default:
                    return true;
            }
        });
    });

    protected override getRowInfo(profile: Profile.Row) {
        if (!this.type) return;
        return <AgendaSection.Insert>{ unit: profile.unit, type: this.type };
    }

    protected onClick(type: AgendaSection.Type) {
        this.type = type;
        this.submit();
    }
}