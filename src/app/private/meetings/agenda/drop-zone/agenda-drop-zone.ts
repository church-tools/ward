import { Component, inject, input } from "@angular/core";
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed } from "../../../../shared/utils/signal-utils";
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";

@Component({
    selector: 'app-agenda-drop-zone',
    template: `
        <div class="agenda-container acrylic-card column gap-4 p-4 shadow-8"
            animate.leave="slide-out">
            @for (agenda of otherAgendas(); track agenda) {
                <div class="card canvas-card">
                    <app-agenda-list-row [row]="agenda"/>
                </div>
            }
        </div>
    `,
    styleUrl: './agenda-drop-zone.scss',
    imports: [AgendaListRowComponent],
})
export class AgendaDropZoneComponent {

    private readonly supabase = inject(SupabaseService);

    readonly currentAgendaId = input.required<number>();

    protected readonly otherAgendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get());
}