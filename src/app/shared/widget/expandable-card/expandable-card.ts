import { Component, model } from '@angular/core';
import Collapse from '../collapse/collapse';

/**
 * A card whose header toggles a collapsible body.
 *
 * Project header content with the `cardHeader` attribute and body content without it:
 *
 * ```html
 * <app-expandable-card [expanded]="open()" (expandedChange)="open.set($event)">
 *     <app-something cardHeader/>
 *     <app-the-body/>
 * </app-expandable-card>
 * ```
 *
 * Clicking anywhere in the header toggles it, except on controls — a text field, button or
 * link inside a header stays usable. The chevron is not rendered here: place an
 * `app-expand-toggle` inside the header row so the card keeps that row's own layout and
 * padding. Bind `expanded` to keep the state elsewhere; leave it unbound and the card
 * remembers it while mounted.
 */
@Component({
    selector: 'app-expandable-card',
    templateUrl: './expandable-card.html',
    styleUrl: './expandable-card.scss',
    imports: [Collapse],
    host: { class: 'full-width' },
})
export default class ExpandableCard {

    readonly expanded = model(false);

    toggle() {
        this.expanded.set(!this.expanded());
    }

    protected onHeaderClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, select, button, a, app-expand-toggle, ' +
            'app-text-input, app-select, app-checkbox'))
            return;
        this.toggle();
    }
}
