import { Component, effect, model, signal } from '@angular/core';
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

    /** Body is only built once expanded, and dropped after the collapse animation finished. */
    protected readonly content = signal(false);

    constructor() {
        effect(() => { if (this.expanded()) this.content.set(true); });
    }

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

    protected onAnimationEnd(expanded: boolean) {
        if (!expanded) this.content.set(false);
    }
}
