import { booleanAttribute, Component, input, output } from "@angular/core";
import { ColorName } from "../../utils/color-utils";
import { xcomputed } from "../../utils/signal-utils";
import { Icon } from "../../icon/icon";

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
        const from = typeof background === 'string' ? background : background[0];
        const to = typeof background === 'string' ? background : background[1];
        return `filled bg-gradient from-${from} to-${to} ${color ?? from}-text`;
    });

    protected remove(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.removeClick.emit(event);
    }
}
