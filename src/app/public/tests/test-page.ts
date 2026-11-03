import { IconCode } from '@/shared/icon/icon';
import { Page } from '@/shared/page/page';
import LinkCard from '@/shared/widget/link-card/link-card';
import { Component } from '@angular/core';

type TestPageLink = {
    href: string;
    label: string;
    icon: IconCode;
};

@Component({
    selector: 'app-test-page',
    template: `
        <span class="display-text">Test</span>
        @for (page of testPages; track page.href) {
            <app-link-card [href]="page.href" [icon]="page.icon" [label]="page.label"/>
        }
    `,
    imports: [LinkCard],
    host: { class: 'page narrow' },
})
export class Test extends Page {

    /** Every page in `public/tests`, so a new one only has to be added here. */
    protected readonly testPages: readonly TestPageLink[] = [
        { href: '/test/font', label: 'Font', icon: 'text_font' },
        { href: '/test/cards', label: 'Cards', icon: 'window_multiple' },
        { href: '/test/colors', label: 'Colours', icon: 'color' },
        { href: '/test/chips', label: 'Chips', icon: 'tag' },
        { href: '/test/markdown', label: 'Markdown', icon: 'text_paragraph' },
        { href: '/test/emails', label: 'Emails', icon: 'mail' },
    ];
}
