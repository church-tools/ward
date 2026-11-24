import { Component, computed, model, viewChild } from '@angular/core';
import Collapse from '../collapse/collapse';

@Component({
    selector: 'app-expandable-card',
    template: `
        <ng-content select="[cardHeader]"/>
        <app-collapse #collapse [show]="expanded()">
            @if (collapse.contentVisible()) {
                <ng-content/>
            }
        </app-collapse>
    `,
    styleUrl: './expandable-card.scss',
    imports: [Collapse],
    host: {
        class: 'full-width',
        '(click)': 'onHeaderClick($event)',
    },
})
export default class ExpandableCard {

    private readonly collapseView = viewChild.required(Collapse);

    readonly expanded = model(false);

    readonly contentVisible = computed(() => this.collapseView().contentVisible());

    toggle() {
        this.expanded.set(!this.expanded());
    }

    protected onHeaderClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('app-collapse')) return;
        if (target.closest('input, textarea, select, button, a, app-expand-toggle, ' +
            'app-text-input, app-select, app-checkbox'))
            return;
        this.toggle();
    }
}
