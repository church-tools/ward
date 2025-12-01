import { AfterViewInit, Component, inject } from '@angular/core';
import { WindowService } from '../service/window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused() || windowService.mobileOS',
        '[class.dense]': '!windowService.isLarge()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly windowService = inject(WindowService);

    constructor() {
        this.windowService.setTitleBarColor({
            focused: { light: '#cedad8', dark: '#172825' },
            unfocused: { light: '#e8e8e8', dark: '#272727' }
        });
    }

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }
}