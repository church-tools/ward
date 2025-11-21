import { Component, input, model } from "@angular/core";
import { Icon, IconComponent } from "../../icon/icon";
import { COLOR_NAMES, ColorName } from "../../utils/color-utils";
import MenuButtonComponent from "../button/menu/menu-button";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-icon-picker',
    template: `
        <app-menu-button type="subtle" [icon]="viewValue()" [items]="[]" class="icon-only">
            <div>
                @for (option of iconOptions(); track option) {
                    <div class="icon-picker-option p-2 cursor-pointer hover-bg-light"
                        [class.bg-light]="option === viewValue()"
                        (click)="setViewValue(option); $event.stopPropagation();">
                        <app-icon [icon]="option" [filled]="filled()" [class]="color() ? color() + '-active' : ''"/>
                    </div>
                }
                @for (c of colors; track c) {
                    <div class="icon-picker-option p-2 cursor-pointer hover-bg-light"
                        (click)="color.set(c); $event.stopPropagation();">
                        <span class="color-swatch" [class]="color + '-active'"></span>
                    </div>
                }
            </div>
        </app-menu-button>
    `,
    providers: getProviders(() => IconPickerComponent),
    imports: [MenuButtonComponent, IconComponent],
})
export class IconPickerComponent extends InputBaseComponent<Icon> {

    readonly iconOptions = input.required<Icon[]>();
    readonly color = model<ColorName>();
    readonly filled = input<boolean>(false);

    protected readonly colors = COLOR_NAMES;
}