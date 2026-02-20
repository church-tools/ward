import { Component, input } from "@angular/core";
import { IconComponent } from "../../icon/icon";
import { PALETTE_COLORS, PaletteColor } from "../../utils/color-utils";
import MenuButtonComponent from "../button/menu/menu-button";
import { ButtonType } from "../button/shared/button-base";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-color-picker',
    template: `
        <app-menu-button [type]="buttonType()"
            class="icon-only" icon="">
            <app-icon button-text icon="circle" filled class="{{value() + '-active'}}"/>
            <div menu-content class="column gap-4">
                <div class="grid gap-2 columns-6 p-2">
                    @for (c of colors; track c) {
                        <div class="position-relative display-flex center-content items-center">
                            <app-icon icon="circle" filled class="{{c}}-active cursor-pointer"
                                (click)="value.set(c); $event.stopPropagation();" title="{{c}}"/>
                            @if (value() === c) {
                                <div class="active-dot"></div>
                            }
                        </div>
                    }
                </div>
            </div>
        </app-menu-button>
    `,
    providers: getProviders(() => ColorPickerComponent),
    imports: [MenuButtonComponent, IconComponent],
    styleUrl: './color-picker.scss',
})
export class ColorPickerComponent extends InputBaseComponent<PaletteColor | null> {

    readonly buttonType = input<ButtonType>('subtle');

    protected readonly colors = PALETTE_COLORS;
}