import { Component, inject, input, signal } from '@angular/core';
import { WindowService } from '../../../shared/service/window.service';
import { groupBy } from '../../../shared/utils/array-utils';
import { wait } from '../../../shared/utils/flow-control-utils';
import { asyncComputed, xcomputed, xeffect } from '../../../shared/utils/signal-utils';
import { InnerNavBarTab, NavbarTabComponent } from './tab/nav-bar-tab';

export type NavBarTab = Omit<InnerNavBarTab, 'index' | 'class'>;

@Component({
    selector: 'app-nav-bar',
    template: `
        <div class="tabs top">
            @for (tab of topTabs(); track tab.index) {
                <app-nav-bar-tab [tab]="tab" [active]="tab === activeTab()" [pillMode]="pillMode()"/>
            }
        </div>
        @if (!horizontal()) {
            <div class="tabs bottom">
                @for (tab of bottomTabs(); track tab.index) {
                    <app-nav-bar-tab [tab]="tab" [active]="tab === activeTab()" [pillMode]="pillMode()"/>
                }
            </div>
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
        '[class.pill-mode]': 'pillMode()',
    }
})
export class NavBarComponent {

    protected readonly windowService = inject(WindowService);

    readonly tabs = input.required<NavBarTab[]>();
    readonly horizontal = input.required<boolean>();

    protected readonly activeTab = signal<InnerNavBarTab | null>(null);
    protected readonly topTabs = xcomputed([this.tabs],
        tabs => this.toInnerTabs(tabs.filter(t => !t.bottom)));
    protected readonly bottomTabs = xcomputed([this.tabs],
        tabs => this.toInnerTabs(tabs.filter(t => t.bottom)));
    protected readonly pillMode = xcomputed([this.windowService.isSmall],
        isSmall => isSmall || this.windowService.mobileOS);
    protected readonly prevTab = asyncComputed([this.activeTab], tab => wait(100).then(() => tab));

    constructor() {
        xeffect([this.windowService.currentRoute, this.topTabs, this.bottomTabs], (currentRoute, topTabs, bottomTabs) => {
            const route = currentRoute.replace(/^\//, ''); // Remove leading slash
            const activeTab = [...topTabs, ...bottomTabs]!
                .reduce((bestMatch, tab) => route.startsWith(tab.path) && tab.path.length > (bestMatch?.path.length || 0)
                ? tab : bestMatch, null as InnerNavBarTab | null);
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