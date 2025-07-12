import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SelectComponent, SelectOption } from '../../../shared/form/select/select';
import { IconComponent } from "../../../shared/icon/icon";

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select class="omni-search-select" [options]="options()" placeholder="{{ 'SEARCH' | translate }} ...">
            <app-icon icon="search" size="sm"/>
        </app-select>
    `,
    imports: [TranslateModule, SelectComponent, IconComponent],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent {

    protected readonly options = signal<SelectOption<{ table: string, id: number }>[]>([]);
}