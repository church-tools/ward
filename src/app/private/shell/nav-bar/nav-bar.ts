import { Component, inject, input, signal } from '@angular/core';
import { WindowService } from '../../../shared/service/window.service';
import { groupBy } from '../../../shared/utils/array-utils';
import { asyncComputed, xcomputed, xeffect } from '../../../shared/utils/signal-utils';
import { InnerNavBarTab, NavbarTabComponent } from './tab/nav-bar-tab';
import { wait } from '../../../shared/utils/flow-control-utils';

export type NavBarTab = Omit<InnerNavBarTab, 'index' | 'class'>;

@Component({
    selector: 'app-nav-bar',
    template: `
        @for (innerTab of innerTabs(); track innerTab.index) {
            <app-nav-bar-tab [tab]="innerTab" [active]="innerTab === activeTab()" [pillMode]="pillMode()"/>
        }
        @if (!pillMode() && activeTab()) {
            <div class="indicator accent-fg tab-{{activeTab()?.index}} prev-tab-{{prevTab()?.index ?? 'none'}}"
                [class.bottom]="activeTab()?.bottom"
                [class.prev-bottom]="prevTab()?.bottom"></div>
        }
    `,
    imports: [NavbarTabComponent],
    styleUrl: './nav-bar.scss',
    host: {
        '[class.horizontal]': 'horizontal()',
    }
})
export class NavBarComponent {

    protected readonly windowService = inject(WindowService);

    readonly tabs = input.required<NavBarTab[]>();
    readonly horizontal = input.required<boolean>();

    protected readonly activeTab = signal<InnerNavBarTab | null>(null);
    protected readonly innerTabs = xcomputed([this.tabs], tabs => this.toInnerTabs(tabs));
    protected readonly pillMode = xcomputed([this.windowService.isSmall],
        isSmall => isSmall || this.windowService.mobileOS);
    protected readonly prevTab = asyncComputed(
        [this.activeTab], tab => wait(100).then(() => tab));

    constructor() {
        xeffect([this.windowService.currentRoute, this.innerTabs], (currentRoute, innerTabs) => {
            const route = currentRoute.replace(/^\//, ''); // Remove leading slash
            const activeTab = innerTabs!.reduce((bestMatch, tab) => {
                return route.startsWith(tab.path) && tab.path.length > (bestMatch?.path.length || 0)
                    ? tab
                    : bestMatch;
            }, null as InnerNavBarTab | null);
            this.activeTab.set(activeTab);
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