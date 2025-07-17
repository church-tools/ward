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

    readonly onClose = output<void>();
    readonly activated = output<string | null>();

    protected readonly activeChild = signal<PageComponent | null>(null);
    protected readonly closing = signal(false);

    private readonly drawerView = viewChild.required('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;
    private readonly routerOutlet = viewChild.required(RouterOutlet);
    
    // Drag state
    private dragState: { startX: number; startTime: number } | null = null;
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
            this.idChangeSubscription = page.onIdChange.subscribe(id => {
                const activatedRoute = this.routerOutlet().activatedRoute;
                const currentRoute = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
                this.activated.emit(currentRoute);
            });
        }
        const activatedRoute = this.routerOutlet().activatedRoute;
        const currentRoute = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
        this.activated.emit(currentRoute);
        this.activeChild.set(page);
        // Wait for the drawer to be displayed, then get its natural width and animate
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
        const width = element.offsetWidth;
        const card = element.querySelector('.drawer-card')! as HTMLElement;
        card.style.minWidth = `${width}px`;
        card.style.left = '0px';
        card.classList.add('fade-out');
        await transitionStyle(element,
            { width: `${width}px` },
            { width: '0px' },
            500, easeOut, true);
        card.classList.remove('fade-out');
        this.activeChild.set(null);
        this.onClose.emit();
        this.closing.set(false);
    }

    protected onDragStart(event: MouseEvent | TouchEvent) {
        const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        this.dragState = { startX: clientX, startTime: Date.now() };
        this.drawerView().nativeElement.style.userSelect = 'none';
        event.preventDefault();
    }

    private handleDrag(event: MouseEvent | TouchEvent) {
        if (!this.dragState) return;

        const currentX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const deltaX = currentX - this.dragState.startX;
        
        if (deltaX > 0) {
            const element = this.drawerView().nativeElement;
            element.style.transform = `translateX(${deltaX}px)`;
            element.style.opacity = `${Math.max(0.3, 1 - deltaX / 200)}`;
        }
        
        event instanceof TouchEvent && event.preventDefault();
    }

    private handleDragEnd(event: MouseEvent | TouchEvent) {
        if (!this.dragState) return;
        
        const element = this.drawerView().nativeElement;
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
        this.abortController.abort();
        this.idChangeSubscription?.unsubscribe();
    }
}