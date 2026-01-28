import { Component, input, output } from '@angular/core';
import { Icon } from '../../icon/icon';
import ButtonComponent from '../button/button';
import MenuButtonComponent from '../button/menu/menu-button';

export type RichTextToolbarItem<T> = {
    icon: Icon;
    title: string;
    shortcut?: string;
    action: T;
}

@Component({
    selector: 'app-rich-text-toolbar-group',
    template: `
        @if (showAll()) {
            @for (item of items(); track item) {
                @let isActive = isActiveCheck()?.(item.action) ?? false;
                <app-button
                    [icon]="item.icon" color="accent"
                    [iconFilled]="isActive"
                    [iconColored]="isActive"
                    [class.active]="isActive"
                    type="subtle" 
                    class="icon-only"
                    [title]="item.title"
                    [shortcut]="item.shortcut ?? null"
                    (click)="onPress(item)"
                    (mousedown)="$event.preventDefault()"/>
            }
        } @else {
            @let mainItem = icon() ? null : items()[0];
            @let isActive = mainItem ? isActiveCheck()?.(mainItem.action) ?? false : false;
            <app-menu-button type="subtle" class="icon-only"
                [icon]="mainItem?.icon ?? icon()"
                [iconFilled]="isActive"
                [iconColored]="isActive"
                [class.active]="isActive"
                [title]="mainItem?.title ?? title()"
                [mainAction]="mainItem ? onPress.bind(this, mainItem) : null"
                [showChevron]="true">
                <div menu-content class="column no-wrap">
                    @for (item of items().slice(icon() ? 0 : 1); track item) {
                        @let isActive = isActiveCheck()?.(item.action) ?? false;
                        <app-button
                            [icon]="item.icon" color="accent"
                            [iconFilled]="isActive"
                            [iconColored]="isActive"
                            [class.active]="isActive"
                            type="subtle" 
                            class="icon-only"
                            [title]="item.title"
                            [shortcut]="item.shortcut ?? null"
                            (click)="onPress(item)"
                            (mousedown)="$event.preventDefault()"/>
                    }
                </div>
            </app-menu-button>
        }
    `,
    host: {
        class: 'row no-wrap'
    },
    imports: [ButtonComponent, MenuButtonComponent],
})
export class RichTextToolbarGroupComponent<T> {

    readonly items = input.required<RichTextToolbarItem<T>[]>();
    readonly showAll = input<boolean>(true);
    readonly icon = input<Icon>();
    readonly title = input<string>();
    readonly press = output<T>();
    readonly isActiveCheck = input<(type: T) => boolean>();

    protected onPress = (item: RichTextToolbarItem<T>) => {
        this.press.emit(item.action);
    }
}