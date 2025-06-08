import { Component, OnDestroy, output } from "@angular/core";
import { IconComponent } from "../../icon/icon";
import ButtonBaseComponent from "./shared/button-base";

@Component({
    selector: 'app-button',
    imports: [IconComponent],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()" [size]="iconSize()"/> }
            <ng-content/>
        </button>
    `,
    styleUrl: './shared/button-base.scss'
})
export default class ButtonComponent extends ButtonBaseComponent implements OnDestroy {

    protected readonly onClick = output<UIEvent | null>();

    protected click(event: UIEvent) {
        this.onClick.emit(event);
        event.preventDefault();
    }

    execute() {
        this.onClick.emit(null);
    }
}