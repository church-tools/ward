import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RowSelectComponent } from "../../../shared/form/row-select/row-select";
import { TextInputComponent } from "../../../shared/form/text/text-input";
import { SupabaseService } from '../../../shared/service/supabase.service';
import { asyncComputed, xcomputed } from '../../../shared/utils/signal-utils';
import { SupaSyncedDirective } from "../../../shared/utils/supa-sync/supa-synced.directive";
import { AgendaSection } from './agenda-section';

@Component({
    selector: 'app-agenda-section-prayer',
    template: `
        <h1>{{ title() | translate }}</h1>
        <app-text-input #textInput [supaSynced]="table" [row]="section()" column="content"
            [class.subtle]="textInput.value()"/>
        <app-row-select table="member"/>
    `,
    imports: [TranslateModule, TextInputComponent, SupaSyncedDirective, RowSelectComponent],
})
export class AgendaSectionPrayerComponent {

    protected readonly supabase = inject(SupabaseService);
    protected readonly table = this.supabase.sync.from('agenda_section');
    
    readonly section = input.required<AgendaSection.Row>();
    
    private readonly allPrayerIds = asyncComputed([this.section],
        section => this.supabase.sync.from('agenda_section').find()
            .eq('type', 'prayer')
            .eq('agenda', section!.agenda)
            .getKeys());
    private readonly isFirst = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[0] === section.id);
    private readonly isLast = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[prayerIds.length - 1] === section.id);

    protected readonly title = xcomputed([this.isFirst, this.isLast],
        (isFirst, isLast) => 'AGENDA_SECTION_TYPE.' + (isFirst ? 'OPENING_PRAYER' : isLast ? 'CLOSING_PRAYER' : 'PRAYER'));
}
