import { Component, ElementRef, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import ButtonComponent from "../../../shared/form/button/button";
import { PageComponent } from "../../../shared/page/page";
import { transitionStyle } from "../../../shared/utils/dom-utils";
import { easeOut } from "../../../shared/utils/style";
import { RowPageComponent } from "../row-page";
import { Subscription } from "rxjs";

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
                    <router-outlet (activate)="onActivate($event)"
                        (deactivate)="onDeactivate($event)"/>
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
        '[class.drawer-open]': 'activeChild()',
        '[class.closing]': 'closing()',
    },
})
export class RouterOutletDrawerComponent implements OnDestroy {

    private static readonly DRAG_THRESHOLD = 10;
    private static readonly SWIPE_TIME_LIMIT = 100;
    private static readonly INTERACTIVE_ELEMENTS = new Set(['button', 'a', 'input', 'textarea', 'select', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    readonly onClose = output<void>();
    readonly activated = output<string | null>();

    protected readonly activeChild = signal<PageComponent | null>(null);
    protected readonly closing = signal(false);

    private readonly drawerView = viewChild.required('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;
    private readonly routerOutlet = viewChild.required(RouterOutlet);
    
    // Drag state
    private dragState: { 
        startX: number; 
        startY: number;
        startTime: number; 
        isDragActive: boolean;
        delayTimeout?: number;
        startedOnBackground?: boolean; // Track if drag started on background
    } | null = null;
    private abortController = new AbortController();
    private idChangeSubscription: Subscription | null = null;

    constructor() {
        // Add global event listeners for drag functionality
        const { signal } = this.abortController;
        document.addEventListener('mousemove', this.handleDrag.bind(this), { signal });
        document.addEventListener('mouseup', this.handleDragEnd.bind(this), { signal });
        document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false, signal });
        document.addEventListener('touchend', this.handleDragEnd.bind(this), { signal });
    }

    protected async onActivate(page: PageComponent) {
        if (page instanceof RowPageComponent) {
            this.idChangeSubscription?.unsubscribe();
            this.idChangeSubscription = page.onIdChange.subscribe(() => this.emitCurrentRoute());
        }
        this.emitCurrentRoute();
        this.activeChild.set(page);
        await this.animateDrawerOpen();
    }

    private emitCurrentRoute() {
        const activatedRoute = this.routerOutlet().activatedRoute;
        const currentRoute = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
        this.activated.emit(currentRoute);
    }

    private async animateDrawerOpen() {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const element = this.drawerView().nativeElement;
        const card = element.querySelector('.drawer-card')! as HTMLElement;
        const width = element.offsetWidth;
        
        card.style.minWidth = `${width}px`;
        card.style.left = '0px';
        
        await transitionStyle(element,
            { minWidth: '0px', width: '0px' },
            { minWidth: `${width}px`, width: `${width}px` },
            500, easeOut, true);
            
        card.style.minWidth = '';
        element.style.width = '';
    }

    protected onDeactivate(page: PageComponent) {
        this.activated.emit(null);
        this.activeChild.set(null);
        this.idChangeSubscription?.unsubscribe();
    }

    protected async close() {
        this.closing.set(true);
        const element = this.drawerView().nativeElement;
        const card = element.querySelector('.drawer-card')! as HTMLElement;
        const width = element.offsetWidth;
        card.style.minWidth = `${width}px`;
        card.style.left = '0px';
        card.classList.add('fade-out');
        await transitionStyle(element, { width: `${width}px` }, { width: '0px' }, 500, easeOut, true);
        card.classList.remove('fade-out');
        this.activeChild.set(null);
        this.onClose.emit();
        this.closing.set(false);
        element.style.transform = '';
        element.style.opacity = '';
        element.style.transition = '';
    }

    protected onDragStart(event: MouseEvent | TouchEvent) {
        const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
        const target = event.target as HTMLElement;
        
        this.clearDragTimeout();
        this.dragState = { 
            startX: clientX, 
            startY: clientY,
            startTime: Date.now(),
            isDragActive: false,
            startedOnBackground: this.isCardBackground(target)
        };
        if (!this.dragState.startedOnBackground) {
            this.dragState.delayTimeout = window.setTimeout(() => {
                if (this.dragState && !this.dragState.isDragActive)
                    this.dragState = null;
            }, RouterOutletDrawerComponent.SWIPE_TIME_LIMIT);
        }
    }

    private isCardBackground(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();
        return !RouterOutletDrawerComponent.INTERACTIVE_ELEMENTS.has(tagName);
    }

    private clearDragTimeout() {
        if (this.dragState?.delayTimeout)
            clearTimeout(this.dragState.delayTimeout);
    }

    private handleDrag(event: MouseEvent | TouchEvent) {
        if (!this.dragState) return;

        const currentX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const currentY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
        
        if (!this.dragState.isDragActive) {
            this.tryActivateDrag(currentX, currentY, event);
        } else if (currentX > this.dragState.startX) {
            this.performDrag(currentX - this.dragState.startX, event);
        }
    }

    private tryActivateDrag(currentX: number, currentY: number, event: MouseEvent | TouchEvent) {
        const { startX, startY, startTime, startedOnBackground } = this.dragState!;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const timeElapsed = Date.now() - startTime;

        if (distance > RouterOutletDrawerComponent.DRAG_THRESHOLD || startedOnBackground) {
            this.clearDragTimeout();
            
            // Allow drag if within time limit OR if started on card background
            if (timeElapsed <= RouterOutletDrawerComponent.SWIPE_TIME_LIMIT || startedOnBackground) {
                this.activateDrag(event);
            } else {
                this.dragState = null; // Too late for swipe on interactive elements
            }
        }
    }

    private activateDrag(event: MouseEvent | TouchEvent) {
        this.dragState!.isDragActive = true;
        this.drawerView().nativeElement.style.userSelect = 'none';
        event.preventDefault();
    }

    private performDrag(deltaX: number, event: MouseEvent | TouchEvent) {
        const element = this.drawerView().nativeElement;
        element.style.transform = `translateX(${deltaX}px)`;
        element.style.opacity = `${Math.max(0.3, 1 - deltaX / 200)}`;
        event.preventDefault();
    }

    private handleDragEnd(event: MouseEvent | TouchEvent) {
        if (!this.dragState) return;
        
        this.clearDragTimeout();
        const element = this.drawerView().nativeElement;
        
        if (this.dragState.isDragActive) {
            const currentX = event instanceof MouseEvent ? event.clientX : event.changedTouches[0].clientX;
            const deltaX = currentX - this.dragState!.startX;
            const velocity = deltaX / (Date.now() - this.dragState!.startTime);
            if (deltaX > 0) {
                if (deltaX > 100 || velocity > 0.5) {
                    this.close();
                } else {
                    // Set the current drag position without transition
                    element.style.transition = '';
                    element.style.transform = `translateX(${deltaX}px)`;
                    element.style.opacity = `${Math.max(0.3, 1 - deltaX / 200)}`;
                    
                    // Use requestAnimationFrame to ensure the position is applied before transition
                    requestAnimationFrame(() => {
                        element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                        element.style.transform = '';
                        element.style.opacity = '';
                        
                        setTimeout(() => element.style.transition = '', 300);
                    });
                }
            }
        }
        
        element.style.userSelect = '';
        this.dragState = null;
    }

    ngOnDestroy() {
        this.abortController.abort();
        this.idChangeSubscription?.unsubscribe();
        this.clearDragTimeout();
    }
}