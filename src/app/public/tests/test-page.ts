import { Icon, IconCode } from '@/shared/icon/icon';
import { Page } from '@/shared/page/page';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HoverNudgeDirective } from '@/shared/utils/hover-nudge.directive';

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
            <a class="stealth card canvas-card selectable-card" [routerLink]="page.href" appHoverNudge>
                <div class="row no-wrap items-center m-6-8">
                    <h3 class="grow-1">
                        <app-icon [icon]="page.icon" filled/>
                        <span class="overflow-ellipsis">{{ page.label }}</span>
                    </h3>
                    <app-icon class="ms-auto" icon="chevron_right"/>
                </div>
            </a>
        }
    `,
    imports: [RouterModule, Icon, HoverNudgeDirective],
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
