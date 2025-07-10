import { animate, group, query, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, inject } from '@angular/core';
import { ChildrenOutletContexts } from '@angular/router';
import { easeIn, easeOut } from '../utils/style';
import WindowService from '../window.service';

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
                animate(`150ms ${easeIn}`, style({
                    opacity: 0,
                    // transform: 'scale(0.98)'
                }))
            ], { optional: true }),
            query(':enter', [
                animate(`300ms 100ms ${easeOut}`, style({
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