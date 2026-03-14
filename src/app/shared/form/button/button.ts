import { Component, OnDestroy, output } from "@angular/core";
import { Icon } from "../../icon/icon";
import ButtonBase from "./shared/button-base";

@Component({
    selector: 'app-button',
    imports: [Icon],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}" [class]="classes()">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
            <ng-content/>
        </button>
    `,
})
export default class Button extends ButtonBase implements OnDestroy {

    protected readonly onClick = output<UIEvent | null>();

    protected click(event: UIEvent) {
        event.preventDefault();
        if (!this.isRealClick()) return;
        this.onClick.emit(event);
    }

    execute() {
        this.onClick.emit(null);
    }
}