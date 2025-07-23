import { Component, inject, input, signal } from '@angular/core';
import { WindowService } from '../../../shared/service/window.service';
import { groupBy } from '../../../shared/utils/array-utils';
import { xcomputed, xeffect } from '../../../shared/utils/signal-utils';
import { InnerNavBarTab, NavbarTabComponent } from './tab/nav-bar-tab';

export type NavBarTab = Omit<InnerNavBarTab, 'index' | 'class'>;

@Component({
    selector: 'app-nav-bar',
    template: `
        @for (innerTab of innerTabs(); track innerTab.index) {
            <app-nav-bar-tab [tab]="innerTab" [active]="innerTab === activeTab()"/>
        }
        @if (!horizontal()) {
            <div class="indicator accent-fg tab-{{activeTab()?.index}} prev-tab-{{prevTab()?.index}}"
                [class.bottom]="activeTab()?.bottom"
                [class.prev-bottom]="prevTab()?.bottom"
                [class.visible]="activeTab()"></div>
        }
    `,
    imports: [NavbarTabComponent],
    styleUrl: './nav-bar.scss',
    host: {
        '[class.horizontal]': 'horizontal()',
    }
})
export class NavBarComponent {

    private readonly windowService = inject(WindowService);

    readonly tabs = input.required<NavBarTab[]>();
    readonly horizontal = input.required<boolean>();

    protected readonly innerTabs = xcomputed([this.tabs], tabs => this.toInnerTabs(tabs));
    protected readonly activeTab = signal<InnerNavBarTab | null>(null);
    protected readonly prevTab = signal<InnerNavBarTab | null>(null);

    constructor() {
        xeffect([this.windowService.currentRoute, this.innerTabs], (currentRoute, innerTabs) => {
            const route = currentRoute.replace(/^\//, ''); // Remove leading slash
            const activeTab = innerTabs!.reduce((bestMatch, tab) => {
                return route.startsWith(tab.path) && tab.path.length > (bestMatch?.path.length || 0)
                    ? tab
                    : bestMatch;
            }, null as InnerNavBarTab | null);
            this.activeTab.set(activeTab);
            if (activeTab) this.prevTab.set(activeTab);
        });
    }

    protected toInnerTabs(tabs: NavBarTab[]): InnerNavBarTab[] {
        const { top, bottom } = groupBy(tabs, t => t.bottom ? 'bottom' : 'top');
        const innerTopTabs = top?.map((tab, index) => <InnerNavBarTab>{ ...tab, index }) ?? [];
        const innerBottomTabs = bottom?.map((tab, index) => <InnerNavBarTab>{ ...tab, index }) ?? [];
        if (innerBottomTabs.length) innerBottomTabs[0].class = 'mt-auto';
        return [...innerTopTabs, ...innerBottomTabs];
    }
}