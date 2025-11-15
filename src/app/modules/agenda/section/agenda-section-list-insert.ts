import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import ButtonComponent from '../../../shared/form/button/button';
import { Profile } from '../../profile/profile';
import { ListInsertComponent } from '../../shared/list-insert';
import { AgendaSection } from './agenda-section';
import { AgendaSectionViewService } from './agenda-section-view.service';

@Component({
    selector: 'app-agenda-section-list-insert',
    template: `
        <div class="row gap-2 center-content">
            @for (option of agendaSectionView.typeOptions; track option) {
                <app-button [icon]="option.icon" type="form" size="large"
                    (onClick)="onClick(option.type)">
                    {{ option.label | async }}
                </app-button>
            }
        </div>
    `,
    imports: [ButtonComponent, AsyncPipe],
})
export class AgendaSectionListInsertComponent extends ListInsertComponent<'agenda_section'> {

    protected readonly agendaSectionView = inject(AgendaSectionViewService);

    private type: AgendaSection.Type | undefined;

    protected override getRowInfo(profile: Profile.Row) {
        if (!this.type) return;
        return <AgendaSection.Insert>{ unit: profile.unit, type: this.type, agenda: 0 };
    }

    protected onClick(type: AgendaSection.Type) {
        this.type = type;
        this.submit();
    }

}