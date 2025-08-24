import { Component, OnInit, input, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { wait } from '../../utils/flow-control-utils';
import { ColorName } from '../../utils/color-utils';

@Component({
    selector: 'app-count-badge',
    template: `
        <div class="count" [class.changing]="changing()">
            {{_count()}}
        </div>
        @if (changing()) {
            <div class="previous-count">
                {{previousCount()}}
            </div>
        }
    `,
    styleUrl: './count-badge.scss',
    host: {
        '[class]': 'color()',
        '[class.increasing]': "count() > previousCount()",
        '[class.hidden]': "count() <= 0",
    },
})
export class CountBadgeComponent implements OnInit {

    protected readonly color = input.required<string, ColorName>({ transform: c => `${c}-fg` });
    protected readonly count = input.required<Observable<number>>();

    protected readonly _count = signal(0);
    protected readonly previousCount = signal(0);
    protected readonly changing = signal(false);

    private initialCount = true;
    private countSubscription: Subscription | undefined;

    async ngOnInit() {
        this.countSubscription = this.count().subscribe(this.updateCount.bind(this));
    }
    
    ngOnDestroy(): void {
        this.countSubscription?.unsubscribe();
    }
    
    private updateCount(count: number) {
        if (this._count() === count) return;
        this.previousCount.set(this._count());
        this._count.set(count);
        if (this.initialCount) {
            this.initialCount = false;
            return;
        }
        this.changing.set(true);
        wait(300).then(() => this.changing.set(false));
    }
}