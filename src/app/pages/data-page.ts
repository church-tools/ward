import { Component } from '@angular/core';
import { PageComponent } from './shared/page';

@Component({
    selector: 'app-data-page',
    template: `
        <h1>Data</h1>
        <p>Data component content goes here.</p>
    `,
})
export class DataPageComponent extends PageComponent {

    constructor() {
        super();
    }

}