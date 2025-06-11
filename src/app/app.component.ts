import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trimPastedStrings } from './shared/utils/clipboard-utils';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class AppComponent {
    
    constructor() {
        trimPastedStrings();
    }
}
