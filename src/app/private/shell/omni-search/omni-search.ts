import { Component, signal } from '@angular/core';
import { SelectComponent, SelectOption } from '../../../shared/form/select/select';

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select [options]="options()"/>
    `,
    imports: [SelectComponent],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent {

    protected readonly options = signal<SelectOption<{ table: string, id: number }>[]>([]);
}