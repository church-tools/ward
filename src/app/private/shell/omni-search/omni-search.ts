import { Component, signal } from '@angular/core';
import { SelectComponent, SelectOption } from '../../../shared/form/select/select';
import { IconComponent } from "../../../shared/icon/icon";

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select [options]="options()" placeholder="Suchen ...">
            <app-icon icon="search" size="sm"/>
        </app-select>
    `,
    imports: [SelectComponent, IconComponent],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent {

    protected readonly options = signal<SelectOption<{ table: string, id: number }>[]>([]);
}