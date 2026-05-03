import { Component, input } from '@angular/core';

@Component({
    selector: 'app-active-indicator',
    template: `
        @if (visible()) {
            <div class="indicator accent-fg"></div>
        }
    `,
    styles: [`
        :host {
            position: absolute;
            pointer-events: none;
            left: var(--active-indicator-left, 0);
            top: var(--active-indicator-top, 50%);
            transform: var(--active-indicator-transform, translateY(-50%));
            width: var(--active-indicator-width, 4px);
            height: var(--active-indicator-height, 40%);
            opacity: 1;
            transition: opacity 180ms ease-out, height 180ms ease-out;

            @starting-style {
                opacity: 0;
                height: var(--active-indicator-start-height, 4px);
            }
        }

        .indicator {
            width: 100%;
            height: 100%;
            border-radius: var(--active-indicator-radius, 2px);
        }

        :host(.disappear) {
            opacity: 0;
            height: var(--active-indicator-start-height, 4px);
        }
    `],
    host: {
        'animate.leave': 'disappear'
    }
})
export class ActiveIndicator {

    readonly visible = input<boolean>(true);

}