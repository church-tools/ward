import { Component, input, output } from '@angular/core';
import { Icon } from '../../icon/icon';

/** The chevron that marks a card as expandable. Place it inside the card's header row. */
@Component({
    selector: 'app-expand-toggle',
    template: `<app-icon icon="chevron_down" class="chevron" [class.rotated]="expanded()"/>`,
    styleUrl: './expand-toggle.scss',
    imports: [Icon],
    host: { '(click)': 'toggle.emit()' },
})
export default class ExpandToggle {

    readonly expanded = input(false);
    readonly toggle = output<void>();
}
