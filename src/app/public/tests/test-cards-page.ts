import LinkButton from '@/shared/form/button/link/link-button';
import { Page } from '@/shared/page/page';
import { Component } from '@angular/core';

@Component({
    selector: 'app-test-cards-page',
    template: `
        <app-link-button icon="arrow_left" type="subtle" size="small" hideNewTab
            href="/test">Test pages</app-link-button>
        <span class="display-text">Cards</span>
        <div class="card background p-5">Test Text</div>
        <div class="card red strong-text p-5">Strong Text with Color</div>
        <div class="card duo from-teal to-goldenrod p-5 column gap-1">
            <h4 class="duo-title m-0">Two theme colours</h4>
            <span class="subtle-text">hairline on the card, first colour on the title</span>
        </div>
    `,
    imports: [LinkButton],
    host: { class: 'page narrow' },
})
export class TestCardsPage extends Page {}
