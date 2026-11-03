import { Component, model } from '@angular/core';
import Collapse from '../collapse/collapse';

@Component({
    selector: 'app-expandable-card',
    templateUrl: './expandable-card.html',
    styleUrl: './expandable-card.scss',
    imports: [Collapse],
    host: {
        class: 'full-width',
        '(click)': 'onHeaderClick($event)',
    },
})
export default class ExpandableCard {

    readonly expanded = model(false);

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
