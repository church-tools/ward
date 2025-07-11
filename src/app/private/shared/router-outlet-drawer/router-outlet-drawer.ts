import { Component, ElementRef, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Subscription } from "rxjs";
import ButtonComponent from "../../../shared/form/button/button";
import { transitionStyle } from "../../../shared/utils/dom-utils";
import { xeffect } from "../../../shared/utils/signal-utils";
import { easeOut } from "../../../shared/utils/style";
import { PageComponent } from "../../../shared/page/page";

@Component({
    selector: 'app-router-outlet-drawer',
    template: `
        <div class="main row center-content">
            <ng-content/>
        </div>
        <div #drawer class="drawer"
            (mousedown)="onDragStart($event)"
            (touchstart)="onDragStart($event)">
            <div class="drawer-card card canvas-card">
                <div class="drawer-body">
                    <router-outlet/>
                </div>
                <app-button type="subtle" icon="dismiss" size="large"
                    class="close-button icon-only"
                    (click)="close()"/>
            </div>
        </div>
    `,
    imports: [RouterOutlet, ButtonComponent],
    styleUrl: './router-outlet-drawer.scss',
    host: {
        '[class.drawer-open]': 'isOpen()',
        '[class.closing]': 'closing()',
    },
})
export class RouterOutletDrawerComponent implements OnDestroy {

    readonly onClose = output<void>();
    readonly activeChild = output<PageComponent>();
    
    protected readonly isOpen = signal(false);
    protected readonly closing = signal(false);

    private readonly drawerView = viewChild.required('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;
    private readonly routerOutlet = viewChild.required(RouterOutlet);

    private routerSubscriptions: Subscription[] = [];
    
    // Drag state
    private dragState: { startX: number; startTime: number } | null = null;
    private abortController = new AbortController();

    constructor() {
        xeffect([this.routerOutlet], outlet => {
            this.isOpen.set(outlet.isActivated);
            this.routerSubscriptions.forEach(sub => sub.unsubscribe());
            this.routerSubscriptions = [
                outlet.activateEvents.subscribe(this.open.bind(this)),
                outlet.deactivateEvents.subscribe(this.close.bind(this)),
            ];
        });
        xeffect([this.isOpen], async open => {
            if (!open) return;
            const element = this.drawerView().nativeElement;
            const width = element.offsetWidth;
            await transitionStyle(element,
                { maxWidth: '0px' },
                { maxWidth: `${width}px` },
                500, easeOut);
            element.style.maxWidth = '';
        });

        // Add global event listeners for drag functionality
        const { signal } = this.abortController;
        document.addEventListener('mousemove', this.handleDrag.bind(this), { signal });
        document.addEventListener('mouseup', this.handleDragEnd.bind(this), { signal });
        document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false, signal });
        document.addEventListener('touchend', this.handleDragEnd.bind(this), { signal });
    }

    private async open() {
        this.isOpen.set(true);
    }

    protected async close() {
        this.closing.set(true);
        const element = this.drawerView()!.nativeElement;
        const width = element.offsetWidth;
        await transitionStyle(element,
            { maxWidth: `${width}px` },
            { maxWidth: '0px' },
            500, easeOut, true);
        this.isOpen.set(false);
        this.onClose.emit();
    }

    protected onDragStart(event: MouseEvent | TouchEvent) {
        const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        this.dragState = { startX: clientX, startTime: Date.now() };
        this.drawerView()!.nativeElement.style.userSelect = 'none';
        event.preventDefault();
    }

    private handleDrag(event: MouseEvent | TouchEvent) {
        if (!this.dragState || !this.drawerView()) return;

        const currentX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const deltaX = currentX - this.dragState.startX;
        
        if (deltaX > 0) {
            const element = this.drawerView()!.nativeElement;
            element.style.transform = `translateX(${deltaX}px)`;
            element.style.opacity = `${Math.max(0.3, 1 - deltaX / 200)}`;
        }
        
        event instanceof TouchEvent && event.preventDefault();
    }

    private handleDragEnd(event: MouseEvent | TouchEvent) {
        if (!this.dragState || !this.drawerView()) return;
        
        const element = this.drawerView()!.nativeElement;
        const currentX = event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX;
        const deltaX = currentX - this.dragState.startX;
        const velocity = deltaX / (Date.now() - this.dragState.startTime);
        
        // Close if dragged far enough or with sufficient velocity
        if (deltaX > 100 || velocity > 0.5) {
            this.close();
        } else {
            // Reset position with animation
            element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            element.style.transform = element.style.opacity = '';
            setTimeout(() => element.style.transition = '', 300);
        }
        
        element.style.userSelect = '';
        this.dragState = null;
    }

    ngOnDestroy() {
        this.routerSubscriptions.forEach(sub => sub.unsubscribe());
        this.abortController.abort(); // Clean up all event listeners at once
    }
}