import { Component, input } from '@angular/core';

/**
 * Simple tooltip for hover interactions - no selection handling
 */
@Component({
    selector: 'app-tooltip',
    template: `
        <ng-content/>
        @if (tooltip()) {
            <div class="tooltip-content" [attr.title]="tooltip()">
                {{ tooltip() }}
            </div>
        }
    `,
    styles: [`
        :host {
            position: relative;
            display: inline-block;
        }
        
        .tooltip-content {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            color: var(--color-text);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease;
            z-index: 1000;
        }
        
        :host(:hover) .tooltip-content {
            opacity: 1;
        }
    `],
    host: {
        '[attr.title]': 'tooltip()'
    }
})
export class SimpleTooltipComponent {
    readonly tooltip = input<string>();
}
