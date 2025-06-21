import { Component } from '@angular/core';
import { ListInsertComponent } from '../shared/list-insert';
import { TextInputComponent } from '../../shared/form/text/text-input';

@Component({
    selector: 'app-agenda-list-insert',
    template: `
        <app-text-input/>
    `,
    imports: [TextInputComponent],
})
export class AgendaListInsertComponent extends ListInsertComponent<'agenda'> {
    

}