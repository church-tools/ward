import { Component } from '@angular/core';
import { PrivatePageComponent } from '../../../shared/private-page';

@Component({
    selector: 'app-task-page',
    template: `
        <span class="h0">??</span>
        Test
        <!-- <app-row-card-list tableName="agenda" [editable]="editMode()" [gap]="4"/> -->
    `,
    styleUrls: ['../../../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [],
})
export class TaskPageComponent extends PrivatePageComponent {
    
}