import { Component, ElementRef, input, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Subscription } from "rxjs";
import ButtonComponent from "../../../shared/form/button/button";
import { transitionStyle } from "../../../shared/utils/dom-utils";
import { xeffect } from "../../../shared/utils/signal-utils";
import { easeOut } from "../../../shared/utils/style";


@Component({
    selector: 'app-drawer',
    template: `
        <div class="main row center-content">
            <ng-content select="[main]"/>
        </div>
        @if (isOpen()) {
            <div #drawer class="drawer"
                (mousedown)="onDragStart($event)"
                (touchstart)="onDragStart($event)">
                <div class="drawer-card card canvas-card">
                    <div class="drawer-body">
                        <ng-content select="[drawer]"/>
                    </div>
                    <app-button type="subtle" icon="dismiss" size="large"
                        class="close-button icon-only"
                        (click)="close()"/>
                </div>
            </div>
        }
    `,
    imports: [ButtonComponent],
    styleUrl: './drawer.scss',
})
export class DrawerComponent implements OnDestroy {

    readonly routerOutlet = input.required<RouterOutlet>();
    readonly onClose = output<void>();
    
    protected readonly isOpen = signal(false);

    private readonly drawerView = viewChild('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;

    private routerSubscriptions: Subscription[] = [];
    
    // Drag state
    private isDragging = false;
    private dragStartX = 0;
    private dragStartTime = 0;
    private readonly dragThreshold = 100; // pixels to drag before closing
    private readonly velocityThreshold = 0.5; // pixels per millisecond
    
    // Bound event handlers for cleanup
    private boundOnDragMove = this.onDragMove.bind(this);
    private boundOnDragEnd = this.onDragEnd.bind(this);

    constructor() {
        xeffect([this.routerOutlet], outlet => {
            this.isOpen.set(outlet.isActivated);
            this.routerSubscriptions.forEach(sub => sub.unsubscribe());
            this.routerSubscriptions = [
                outlet.activateEvents.subscribe(this.open.bind(this)),
                outlet.deactivateEvents.subscribe(this.close.bind(this)),
            ];
        });
        xeffect([this.drawerView], async drawer => {
            if (!drawer) return;
            const element = drawer.nativeElement;
            const width = element.offsetWidth;
            const margin = (element.computedStyleMap().get('margin-left') as CSSUnitValue).value;
            await transitionStyle(element,
                { maxWidth: '0px', marginLeft: '0px' },
                { maxWidth: `${width}px`, marginLeft: `${margin}` },
                500, easeOut);
            element.style.maxWidth = '';
            element.style.marginLeft = `${margin}px`;
        });

        // Add global event listeners for drag functionality
        document.addEventListener('mousemove', this.boundOnDragMove);
        document.addEventListener('mouseup', this.boundOnDragEnd);
        document.addEventListener('touchmove', this.boundOnDragMove, { passive: false });
        document.addEventListener('touchend', this.boundOnDragEnd);
    }

    private async open() {
        this.isOpen.set(true);
    }

    protected async close() {
        const element = this.drawerView()!.nativeElement;
        const width = element.offsetWidth;
        const margin = (element.computedStyleMap().get('margin-left') as CSSUnitValue).value;
        await transitionStyle(element,
            { maxWidth: `${width}px`, marginLeft: `${margin}` },
            { maxWidth: '0px', marginLeft: '0px' },
            500, easeOut, true);
        this.isOpen.set(false);
        this.onClose.emit();
    }

    protected onDragStart(event: MouseEvent | TouchEvent) {
        this.isDragging = true;
        this.dragStartTime = Date.now();
        
        if (event instanceof MouseEvent) {
            this.dragStartX = event.clientX;
        } else {
            this.dragStartX = event.touches[0].clientX;
        }
        
        // Prevent text selection during drag
        const element = this.drawerView()!.nativeElement;
        element.style.userSelect = 'none';
        
        // Prevent default to avoid text selection or scrolling
        event.preventDefault();
    }

    private onDragMove(event: MouseEvent | TouchEvent) {
        if (!this.isDragging || !this.drawerView()) return;

        const currentX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const deltaX = currentX - this.dragStartX;
        
        // Only allow dragging to the right (positive deltaX)
        if (deltaX > 0) {
            const element = this.drawerView()!.nativeElement;
            element.style.transform = `translateX(${deltaX}px)`;
            element.style.opacity = `${Math.max(0.3, 1 - (deltaX / 200))}`;
        }
        
        // Prevent default to avoid scrolling on touch
        if (event instanceof TouchEvent) {
            event.preventDefault();
        }
    }

    private onDragEnd(event: MouseEvent | TouchEvent) {
        if (!this.isDragging || !this.drawerView()) return;
        
        this.isDragging = false;
        const element = this.drawerView()!.nativeElement;
        
        const currentX = event instanceof MouseEvent 
            ? event.clientX 
            : event.changedTouches[0].clientX;
        const deltaX = currentX - this.dragStartX;
        const dragTime = Date.now() - this.dragStartTime;
        const velocity = deltaX / dragTime;
        
        // Close if dragged far enough or with sufficient velocity
        const shouldClose = deltaX > this.dragThreshold || velocity > this.velocityThreshold;
        
        if (shouldClose) {
            this.close();
        } else {
            // Reset position with animation
            element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            element.style.transform = '';
            element.style.opacity = '';
            
            // Remove transition after animation completes
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        }
        
        // Re-enable text selection
        element.style.userSelect = '';
    }

    ngOnDestroy() {
        this.routerSubscriptions.forEach(sub => sub.unsubscribe());
        
        // Clean up global event listeners
        document.removeEventListener('mousemove', this.boundOnDragMove);
        document.removeEventListener('mouseup', this.boundOnDragEnd);
        document.removeEventListener('touchmove', this.boundOnDragMove);
        document.removeEventListener('touchend', this.boundOnDragEnd);
    }
}