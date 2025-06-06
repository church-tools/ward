import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { createDarkTheme, createLightTheme, type BrandVariants } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
import WindowService from './shared/window.service';
import { range } from './shared/utils/array-utils';
import { getColorShade } from './shared/utils/color-utitls';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class AppComponent {
  	
    private readonly windowService = inject(WindowService);

    // Custom brass brand variants from Fluent UI palette
    private readonly brassBrand = Object.fromEntries(
        range(10, 160, 10)
        .map(variant => [variant, getColorShade("teal", variant)])
    ) as BrandVariants;

    // Create custom themes with brass branding
    private readonly customLightTheme = createLightTheme(this.brassBrand);
    private readonly customDarkTheme = createDarkTheme(this.brassBrand);

    constructor() {
        effect(() => {
            const dark = this.windowService.darkColorScheme();
            setTheme(dark ? this.customDarkTheme : this.customLightTheme);
        });
    }
}
