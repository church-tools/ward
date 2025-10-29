import { Component, ElementRef, inject, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import ButtonComponent from "../../../shared/form/button/button";
import { PageComponent } from "../../../shared/page/page";
import { WindowService } from "../../../shared/service/window.service";
import { transitionStyle } from "../../../shared/utils/dom-utils";
import { wait } from "../../../shared/utils/flow-control-utils";
import { xeffect } from "../../../shared/utils/signal-utils";
import { animationDurationLgMs, animationDurationMs, animationDurationSmMs, easeOut } from "../../../shared/utils/style";
import { RowPageComponent } from "../row-page";

@Component({
    selector: 'app-router-outlet-drawer',
    templateUrl: './router-outlet-drawer.html',
    imports: [RouterOutlet, ButtonComponent],
    styleUrl: './router-outlet-drawer.scss',
    host: {
        'animate.enter': 'show-gap',
        '[class.drawer-open]': 'activeChild()',
        '[class.closing]': 'closing()',
        '[class.content-changing]': 'contentChanging()',
        '[class.dense]': '!windowService.isLarge()',
    },
})
export class RouterOutletDrawerComponent implements OnDestroy {

    private static readonly DRAG_THRESHOLD = 10;
    private static readonly SWIPE_TIME_LIMIT = 100;
    private static readonly INTERACTIVE_ELEMENTS = new Set(['button', 'a', 'input', 'textarea', 'select', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    protected readonly windowService = inject(WindowService);
    private readonly router = inject(Router);

    readonly activated = output<string | null>();

    protected readonly activeChild = signal<PageComponent | null>(null);
    protected readonly closing = signal(false);
    protected readonly contentChanging = signal(false);
    protected readonly onBottom = this.windowService.isSmall;

    private readonly drawerView = viewChild('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;
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
    private readonly abortController = new AbortController();

    constructor() {
        // Add global event listeners for drag functionality
        const { signal } = this.abortController;
        document.addEventListener('mousemove', this.handleDrag.bind(this), { signal });
        document.addEventListener('mouseup', this.handleDragEnd.bind(this), { signal });
        document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false, signal });
        document.addEventListener('touchend', this.handleDragEnd.bind(this), { signal });
        xeffect([this.drawerView], drawer => {
            drawer?.nativeElement.addEventListener('mousedown', this.onDragStart.bind(this), { passive: true });
            drawer?.nativeElement.addEventListener('touchstart', this.onDragStart.bind(this), { passive: true });
        });
    }

    protected async onActivate(page: PageComponent) {
        this.emitCurrentRoute();
        this.activeChild.set(page);
        await this.animateDrawerOpen();
        if (page instanceof RowPageComponent) {
            page.onIdChange = async _ => {
                this.contentChanging.set(true);
                setTimeout(() => this.contentChanging.set(false), animationDurationLgMs);
                this.emitCurrentRoute();
                await wait(animationDurationLgMs * 0.25);
            };
        }
    }

    protected onDeactivate(page: PageComponent) {
        this.activated.emit(null);
        this.animateDrawerClose();
        if (page instanceof RowPageComponent)
            delete page.onIdChange;
    }

    protected async onClose() {
        await this.animateDrawerClose();
        this.router.navigate(['..'], { relativeTo: this.routerOutlet().activatedRoute });
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
        if (this.onBottom()) {
            card.style.minWidth = ``;
            return;
        }
        const width = element.offsetWidth;
        
        card.style.minWidth = `${width}px`;
        card.style.left = '0px';
        
        await transitionStyle(element,
            { minWidth: '0px', width: '0px' },
            { minWidth: `${width}px`, width: `${width}px` },
            animationDurationLgMs, easeOut, true);
            
        card.style.minWidth = '';
    }

    private async animateDrawerClose() {
        const page = this.activeChild();
        if (!page) return;
        this.closing.set(true);
        if (page instanceof RowPageComponent)
            page.close();
        const element = this.drawerView().nativeElement;
        const card = element.querySelector('.drawer-card')! as HTMLElement;
        if (this.onBottom()) {
            const height = element.offsetHeight;
            card.style.minHeight = `${height}px`;
            element.style.minHeight = `${height}px`;
            await wait(animationDurationMs);
            card.style.minHeight = '';
        } else {
            const width = element.offsetWidth;
            card.style.minWidth = `${width}px`;
            card.style.left = '0px';
            card.classList.add('fade-out');
            await transitionStyle(element, { width: `${width}px` }, { width: '0px' }, animationDurationLgMs, easeOut, true);
            card.classList.remove('fade-out');
        }
        element.style.opacity = '';
        element.style.transform = '';
        element.style.transition = '';
        this.closing.set(false);
        if (this.contentChanging()) return;
        this.activeChild.set(null);
    }

    private onDragStart(event: MouseEvent | TouchEvent) {
        const { clientX, clientY } = event instanceof MouseEvent ? event : event.touches[0];
        this.clearDragTimeout();
        this.dragState = { 
            startX: clientX, 
            startY: clientY,
            startTime: Date.now(),
            isDragActive: false,
            startedOnBackground: this.isCardBackground(event.target as HTMLElement),
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
        const current = event instanceof MouseEvent ? event : event.touches[0];
        if (!this.dragState.isDragActive) {
            this.tryActivateDrag(current, event);
        } else {
            const isBottom = this.onBottom();
            const delta = isBottom
                ? current.clientY - this.dragState.startY
                : current.clientX - this.dragState.startX;
            if (delta > 0)
                this.performDrag(delta, event, isBottom);
        }
    }

    private tryActivateDrag(current: Touch | MouseEvent, event: MouseEvent | TouchEvent): any {
        const { startX, startY, startTime, startedOnBackground } = this.dragState!;
        const deltaX = current.clientX - startX;
        const deltaY = current.clientY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const timeElapsed = Date.now() - startTime;
        if (distance > RouterOutletDrawerComponent.DRAG_THRESHOLD || startedOnBackground) {
            this.clearDragTimeout();
            if (timeElapsed <= RouterOutletDrawerComponent.SWIPE_TIME_LIMIT || startedOnBackground)
                this.activateDrag(event);
            else
                this.dragState = null;
        }
    }

    private activateDrag(event: MouseEvent | TouchEvent) {
        this.dragState!.isDragActive = true;
        this.drawerView().nativeElement.style.userSelect = 'none';
        event.preventDefault();
    }

    private performDrag(delta: number, event: MouseEvent | TouchEvent, isBottom: boolean) {
        const element = this.drawerView().nativeElement;
        element.style.transform = `translate${isBottom ? 'Y' : 'X'}(${delta}px)`;
        if (!this.onBottom())
            element.style.opacity = `${Math.max(0.3, 1 - delta / animationDurationSmMs)}`;
        event.preventDefault();
    }

    private async handleDragEnd(event: MouseEvent | TouchEvent) {
        if (!this.dragState) return;
        
        this.clearDragTimeout();
        const element = this.drawerView().nativeElement;
        
        if (this.dragState.isDragActive) {
            const { clientX, clientY } = event instanceof MouseEvent ? event : event.changedTouches[0];
            const isBottom = this.onBottom();
            const delta = isBottom ? clientY - this.dragState.startY : clientX - this.dragState.startX;
            const velocity = delta / (Date.now() - this.dragState.startTime);
            if (delta > 0) {
                if (delta > 100 || velocity > 0.5)
                    this.onClose();
                else
                    this.snapBackDrawer(element, delta, isBottom);
            }
        }
        element.style.userSelect = '';
        this.dragState = null;
    }

    private snapBackDrawer(element: HTMLElement, delta: number, isBottom: boolean) {
        element.style.transition = '';
        element.style.transform = `translate${isBottom ? 'Y' : 'X'}(${delta}px)`;
        if (!isBottom)
            element.style.opacity = `${Math.max(0.3, 1 - delta / animationDurationSmMs)}`;
        requestAnimationFrame(() => {
            element.style.transition = isBottom
                ? 'transform 0.3s ease-out'
                : 'transform 0.3s ease-out, opacity 0.3s ease-out';
            element.style.transform = '';
            element.style.opacity = '';
            setTimeout(() => element.style.transition = '', animationDurationMs);
        });
    }

    ngOnDestroy() {
        this.abortController.abort();
        this.clearDragTimeout();
    }
}