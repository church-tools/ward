import { Component, input, model } from "@angular/core";
import { Icon, IconComponent } from "../../icon/icon";
import { PALETTE_COLORS, PaletteColor } from "../../utils/color-utils";
import MenuButtonComponent from "../button/menu/menu-button";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-icon-picker',
    template: `
        <app-menu-button type="subtle"
            class="icon-only"
            [items]="[]"
            icon="">
            <app-icon button-text [icon]="viewValue() ?? 'question_circle'" [filled]="filled()" class="{{color() + '-active'}}"/>
            <div menu-content class="column gap-4">
                <div class="grid gap-2 columns-6 p-2">
                    @for (option of iconOptions(); track option) {
                        <app-icon [icon]="option" [filled]="value() === option" class="cursor-pointer"
                            (click)="setViewValue(option); $event.stopPropagation();"/>
                    }
                </div>
                <div class="grid gap-2 columns-6 p-2">
                    @for (c of colors; track c) {
                        <app-icon icon="circle"  [filled]="color() === c" class="{{c}}-active cursor-pointer"
                            (click)="color.set(c); $event.stopPropagation();"/>
                    }
                </div>
            </div>
        </app-menu-button>
    `,
    providers: getProviders(() => IconPickerComponent),
    imports: [MenuButtonComponent, IconComponent],
})
export class IconPickerComponent extends InputBaseComponent<Icon> {

    readonly iconOptions = input.required<readonly Icon[]>();
    readonly color = model<PaletteColor | null>();
    readonly filled = input<boolean>(false);

    protected readonly colors = PALETTE_COLORS;
}