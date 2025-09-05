import { AfterViewInit, Component, inject } from '@angular/core';
import { WindowService } from '../service/window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused()',
        '[class.dense]': '!windowService.isLarge()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly windowService = inject(WindowService);

    constructor() {
        this.windowService.setTitleBarColor({
            focused: { light: '#cedfdd', dark: '#182c2a' },
            unfocused: { light: '#e0e0e0', dark: '#202020' }
        });
    }

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }
}