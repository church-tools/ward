import LinkButton from '@/shared/form/button/link/link-button';
import { Page } from '@/shared/page/page';
import { Component } from '@angular/core';

@Component({
    selector: 'app-test-font-page',
    template: `
        <app-link-button icon="arrow_left" type="subtle" size="small" hideNewTab
            href="/test">Test pages</app-link-button>
        <span class="display-text">Font</span>
        <p>Dies ist eine Testseite</p>
        <h1>Überschrift 1</h1>
        <p>Dies ist ein body</p>
        <h2>Überschrift 2</h2>
        <p>Dies ist ein body</p>
        <h3>Überschrift 3</h3>
        <p>Dies ist ein body</p>
        <h4>Überschrift 4</h4>
        <p>Dies ist ein body</p>
        <h5>Überschrift 5</h5>
        <p>Dies ist ein body</p>
        <h6>Überschrift 6</h6>
        <p>Dies ist ein body</p>
    `,
    imports: [LinkButton],
    host: { class: 'page narrow' },
})
export class TestFontPage extends Page {}
