import LinkButton from '@/shared/form/button/link/link-button';
import { Page } from '@/shared/page/page';
import { Component } from '@angular/core';
import { PALETTE_COLORS } from '@/shared/utils/color-utils';

@Component({
    selector: 'app-test-colors-page',
    template: `
        <app-link-button icon="arrow_left" type="subtle" size="small" hideNewTab
            href="/test">Test pages</app-link-button>
        <span class="display-text">Colours</span>
        <p>Dies ist eine Testseite</p>
        <div class="column gap-2">
            @for (color of colorNames; track color) {
                <div class="row gap-2">
                    <div class="col p-3 round {{color}}-mute-bg"></div>
                    <div class="col p-3 round {{color}}-bg"></div>
                    <div class="col p-3 round {{color}}-active-bg"></div>
                    <div class="col p-3 round {{color}}-fg"></div>
                    <div class="col p-3 round {{color}}-high-contrast-bg"></div>
                    <div> hue: {{ $index * 15 }}  <span class="ms-3">{{ color }}</span></div>
                </div>
            }
        </div>
    `,
    imports: [LinkButton],
    host: { class: 'page narrow' },
})
export class TestColorsPage extends Page {

    protected readonly colorNames = PALETTE_COLORS;
}
