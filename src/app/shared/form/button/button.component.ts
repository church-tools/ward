import { ChangeDetectionStrategy, Component, OnDestroy, output } from "@angular/core";
import { IconComponent } from "../../icon/icon";
import ButtonBaseComponent from "./button-base.component";

@Component({
    selector: 'app-button',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IconComponent],
    templateUrl: './button.component.html',
    styleUrl: './button-base.component.scss'
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