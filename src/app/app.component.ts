import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { webDarkTheme, webLightTheme } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
import WindowService from './shared/window.service';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class AppComponent {
  	
    private readonly windowService = inject(WindowService);

    constructor() {

        effect(() => {
            const dark = this.windowService.darkColorScheme();
            
            setTheme(dark ? webDarkTheme : webLightTheme);
        });
    }
}
