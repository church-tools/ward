import { Component, input, output } from '@angular/core';
import { Icon } from '../../icon/icon';
import ButtonComponent from '../button/button';

export type RichTextToolbarButton<T> = {
    icon: Icon;
    title: string;
    shortcut?: string;
    action: T;
    customAction?: () => void;
    customIsActive?: () => boolean;
}

@Component({
    selector: 'app-rich-text-toolbar-group',
    template: `
        @for (button of buttons(); track $index) {
            <app-button
                [icon]="button.icon" color="accent"
                [iconColored]="isActiveCheck()?.(button.action) ?? false"
                type="subtle" 
                class="icon-only"
                [title]="button.title"
                [shortcut]="button.shortcut ?? null"
                (click)="click.emit(button.action)"
                (mousedown)="$event.preventDefault()"/>
        }
    `,
    host: {
        class: 'row no-wrap'
    },
    imports: [ButtonComponent],
})
export class RichTextToolbarGroupComponent<T> {

    readonly buttons = input.required<RichTextToolbarButton<T>[]>();
    readonly isActiveCheck = input<(type: T) => boolean>();
    readonly click = output<T>();
    
}