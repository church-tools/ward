import { AfterViewInit, Component, inject } from '@angular/core';
import WindowService from '../window.service';
import { ChildrenOutletContexts } from '@angular/router';
import { animate, query, style, transition, trigger, group } from '@angular/animations';

export const pageAnimations = trigger('routeAnimations', [
    transition('* <=> *', [
        query(':enter, :leave', [
            style({
                position: 'absolute',
            })
        ], { optional: true }),
        query(':enter .animated, :leave .animated', [
            style({ 
                animation: 'none !important',
                transform: 'none',
                opacity: 1
            })
        ], { optional: true }),
        query(':enter', [
            style({
                opacity: 0,
                transform: 'translateY(100px)'
            })
        ], { optional: true }),
        group([
            query(':leave', [
                animate('100ms cubic-bezier(0.55, 0.055, 0.675, 0.19)', style({
                    opacity: 0,
                    // transform: 'scale(0.98)'
                }))
            ], { optional: true }),
            query(':enter', [
                animate('300ms 100ms cubic-bezier(0.075, 0.82, 0.165, 1)', style({
                    opacity: 1,
                    transform: 'translateY(0)'
                }))
            ], { optional: true })
        ])
    ])
]);

@Component({
    selector: 'app-shell',
    template: '',
    animations: [pageAnimations],
    host: {
        '[class.focused]': 'windowService.focused()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly windowService = inject(WindowService);
    private readonly contexts = inject(ChildrenOutletContexts);

    protected getRouteAnimationData() {
        return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
    }

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }
}