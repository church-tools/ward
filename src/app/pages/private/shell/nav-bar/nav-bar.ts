import { Component, input } from '@angular/core';
import { TablistWrapperModule, TabWrapperModule } from "@fabric-msft/fluent-angular";
import { Icon, IconComponent } from '../../../../shared/icon/icon';

export type NavTab = {
    path: string;
    label: string;
    icon: Icon;
}

@Component({
    selector: 'app-nav-bar',
    template: `
        <fluent-Tablist [orientation]="horizontal() ? 'horizontal' : 'vertical'" size="large">
            @for (tab of tabs(); track tab.path) {
                <fluent-tab [id]="tab.path">
                    <app-icon [icon]="tab.icon" size="lg"></app-icon>
                    {{ tab.label }}
                </fluent-tab>
            }
        </fluent-Tablist>
    `,
    imports: [TablistWrapperModule, TabWrapperModule, IconComponent],
    styleUrl: './nav-bar.scss',
})
export class NavBarComponent {

    readonly tabs = input.required<NavTab[]>();
    readonly horizontal = input.required<boolean>();

}