import { booleanAttribute, Component, input, model } from "@angular/core";
import { Icon, IconComponent } from "../../icon/icon";
import { PALETTE_COLORS, PaletteColor } from "../../utils/color-utils";
import MenuButtonComponent from "../button/menu/menu-button";
import { ButtonType } from "../button/shared/button-base";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-icon-picker',
    template: `
        <app-menu-button [type]="buttonType()"
            class="icon-only" icon="">
            <app-icon button-text [icon]="viewValue() ?? 'question_circle'" [filled]="filled()" class="{{color() + '-active'}}"/>
            <div menu-content class="column gap-4">
                <div class="grid gap-2 columns-6 p-2">
                    @for (option of iconOptions(); track option) {
                        <app-icon [icon]="option" [filled]="value() === option" class="cursor-pointer"
                            (click)="setViewValue(option); $event.stopPropagation();" title="{{option}}"/>
                    }
                </div>
                <div class="grid gap-2 columns-6 p-2">
                    @for (c of colors; track c) {
                        <div class="position-relative display-flex center-content items-center">
                            <app-icon icon="circle" filled class="{{c}}-active cursor-pointer"
                                (click)="color.set(c); $event.stopPropagation();" title="{{c}}"/>
                            @if (color() === c) {
                                <div class="active-dot"></div>
                            }
                        </div>
                    }
                </div>
            </div>
        </app-menu-button>
    `,
    providers: getProviders(() => IconPickerComponent),
    imports: [MenuButtonComponent, IconComponent],
    styleUrl: './icon-picker.scss',
})
export class IconPickerComponent extends InputBaseComponent<Icon> {

    readonly iconOptions = input.required<readonly Icon[]>();
    readonly color = model<PaletteColor | null>();
    readonly buttonType = input<ButtonType>('subtle');
    readonly filled = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected readonly colors = PALETTE_COLORS;
}