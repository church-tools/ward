import { Component, OnDestroy, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Icon, IconComponent } from '../../../../shared/icon/icon';
import { ColorName } from '../../../../shared/utils/color-utitls';

export type InnerNavBarTab = {
    icon: Icon;
    translateId: string;
    path: string;
    index: number;
    counts?: { count: Observable<number>, color: ColorName }[];
    class?: string;
    bottom?: boolean;
};

@Component({
    selector: 'app-nav-bar-tab',
    imports: [RouterModule, TranslateModule, IconComponent],
    template: `
        <a class="btn no-hover" [routerLink]="tab().path" [class.active]="active()">
            <app-icon class="icon" [icon]="tab().icon"/>
            <app-icon class="active-icon accent" [icon]="tab().icon" [filled]="true"/>
            <div class="tab-title">{{ 'NAV_BAR_TAB.' + tab().translateId | translate }}</div>
        </a>
        @if (tab().counts) {
            <div class="counts column" [class.visible]="!active()">
                @for (count of tab().counts; track $index) {
                    <div class="count-dot {{count.color}}-fg" [class.visible]="visibleCounts().has(count)"></div>
                }
            </div>
        }
    `,
    styleUrl: './nav-bar-tab.scss',
    host: {
        '[class]': 'tab().class'
    }
})
export class NavbarTabComponent implements OnDestroy {
    
    readonly tab = input.required<InnerNavBarTab>();
    readonly active = input.required<boolean>();

    protected readonly visibleCounts = signal(new Set<any>());

    // private countSubscriptions: Subscription[];

    constructor() {
        // multiEffect([this.tab], async tab => {
        //     this.countSubscriptions?.forEach(sub => sub.unsubscribe());
        //     if (!tab.counts) return;
        //     this.countSubscriptions = await Promise.all(tab.counts.map(async count => {
        //         const observable = countInfoToObservable(await count.info());
        //         const thisSet = new Set([count]);
        //         return observable.subscribe(count => {
        //             if (count > 0) this.visibleCounts.update(set => set.union(thisSet));
        //             else this.visibleCounts.update(set => set.difference(thisSet));
        //         });
        //     }));
        // })
    }

    ngOnDestroy() {
        // this.countSubscriptions?.forEach(sub => sub.unsubscribe());
    }
}
