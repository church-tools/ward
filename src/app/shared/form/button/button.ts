import { Component, OnDestroy, output } from "@angular/core";
import { IconComponent } from "../../icon/icon";
import ButtonBaseComponent from "./shared/button-base";

@Component({
    selector: 'app-button',
    imports: [IconComponent],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}" [class]="classes()">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
            <ng-content/>
        </button>
    `,
})
export default class ButtonComponent extends ButtonBaseComponent implements OnDestroy {

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