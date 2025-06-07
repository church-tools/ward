import { Component } from '@angular/core';
import ButtonComponent from '../../../shared/form/button/button.component';
import { PageComponent } from '../../shared/page';
import { TextInputComponent } from "../../../shared/form/text/text-input";

@Component({
    selector: 'app-setup-page',
    imports: [ButtonComponent, TextInputComponent],
    templateUrl: './setup-page.html',
    styleUrls: ['../../shared/page.scss'],
    host: {
        class: 'narrow',
    }
})
export class SetupPageComponent extends PageComponent {

    constructor() {
        super();
    }

    protected async createUnit(): Promise<void> {
        
    }
}