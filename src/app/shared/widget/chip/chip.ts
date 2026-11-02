import { booleanAttribute, Component, input, output } from "@angular/core";
import { ColorName } from "../../utils/color-utils";
import { xcomputed } from "../../utils/signal-utils";
import { Icon } from "../../icon/icon";

/** One colour fills the chip; a pair is a household's two theme colours, shown as a
    tinted body with a label that runs through both foregrounds (see chip.scss). */
export type ChipFill = ColorName | readonly [ColorName, ColorName];

@Component({
    selector: 'app-chip',
    imports: [Icon],
    template: `
        <span class="chip-view"><ng-content/></span>
        @if (removable()) {
            <button class="delete-btn subtle icon-only tiny" type="button"
                (click)="remove($event)">
                <app-icon icon="dismiss" size="xs"/>
            </button>
        }
    `,
    styleUrl: './chip.scss',
    host: {
        '[class]': 'classes()',
        '[class.clickable]': 'clickable()',
    },
})
export class Chip {

    readonly color = input<ColorName>();

    readonly background = input<ChipFill>();
    readonly clickable = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly removable = input<boolean, unknown>(false, { transform: booleanAttribute });

    readonly removeClick = output<MouseEvent>();

    protected readonly classes = xcomputed([this.color, this.background], (color, background) => {
        if (background == null)
            return color ? `${color}-text` : '';
        if (typeof background === 'string')
            return `filled bg-gradient from-${background} to-${background} ${color ?? background}-text`;
        // `filled` is what gives a duo chip its hover and press feedback.
        return `duo filled from-${background[0]} to-${background[1]}`;
    });

    protected remove(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.removeClick.emit(event);
    }
}
