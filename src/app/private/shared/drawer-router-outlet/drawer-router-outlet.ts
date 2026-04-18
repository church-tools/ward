import { Component, ElementRef, inject, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { ActivatedRoute, Router, RouterOutlet } from "@angular/router";
import { Button } from "@/shared/form/button/button";
import { Page } from "@/shared/page/page";
import { WindowService } from "@/shared/service/window.service";
import { transitionStyle } from "@/shared/utils/dom-utils";
import { wait } from "@/shared/utils/flow-control-utils";
import { xeffect } from "@/shared/utils/signal-utils";
import { animationDurationLgMs, animationDurationMs, easeOut } from "@/shared/utils/style";
import { DrawerDragController } from "./drawer-drag-controller";
import { applyDrawerDragStyles, calculateDragOpacity, clearTimeoutRef, getDrawerCard, resetDrawerVisualState } from "./drawer-router-outlet.utils";
import { RowPage } from "../row-page";

@Component({
    selector: 'app-drawer-router-outlet',
    templateUrl: './drawer-router-outlet.html',
    imports: [RouterOutlet, Button],
    styleUrl: './drawer-router-outlet.scss',
    host: {
        'animate.enter': 'show-gap',
        '[class.drawer-open]': 'activeChild()',
        '[class.closing]': 'closing()',
        '[class.content-changing]': 'contentChanging()',
        '[class.dragging]': 'isDragging()',
        '[class.dense]': '!windowService.isLarge()',
    },
})
export class DrawerRouterOutlet implements OnDestroy {

    protected readonly windowService = inject(WindowService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly activated = output<string | null>();

    protected readonly activeChild = signal<Page | null>(null);
    protected readonly closing = signal(false);
    protected readonly contentChanging = signal(false);
    protected readonly isDragging = signal(false);
    protected readonly onBottom = this.windowService.isSmall;

    private readonly drawerView = viewChild('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;
    private readonly routerOutlet = viewChild.required(RouterOutlet);
    private contentChangeTimeout: number | undefined;
    private snapBackTimeout: number | undefined;
    private transitionToken = 0;
    private pendingChildRouteSwap = false;
    private contentSnapshotEl: HTMLElement | undefined;
    private contentMaskObserver: MutationObserver | undefined;

    private static readonly contentSnapshotClass = 'drawer-content-snapshot';

    private readonly dragController = new DrawerDragController({
        isBottom: () => this.onBottom(),
        setDragging: dragging => this.isDragging.set(dragging),
        onPreview: (delta, isBottom) => {
            const drawer = this.drawerView();
            if (!drawer)
                return;
            applyDrawerDragStyles(drawer.nativeElement, delta, isBottom);
        },
        onSnapBack: (delta, isBottom) => this.snapBackDrawer(delta, isBottom),
        onClose: (delta, isBottom) => {
            void this.onClose(isBottom ? delta : undefined);
        },
    });

    constructor() {
        xeffect([this.drawerView], drawer => {
            if (!drawer) return;
            this.dragController.attach(drawer.nativeElement);
        });
    }

    protected async onActivate(page: Page) {
        const replacingChildRoute = this.pendingChildRouteSwap || this.activeChild() !== null;
        this.pendingChildRouteSwap = false;
        this.cancelPendingAnimations(replacingChildRoute);
        const token = ++this.transitionToken;
        this.emitCurrentRoute();
        this.activeChild.set(page);
        if (replacingChildRoute)
            await this.animateDrawerContentChange(token, () => this.clearContentSnapshot(), 0.25);
        else
            await this.animateDrawerOpen(token);
        if (token !== this.transitionToken)
            return;
        page.closePage = async () => {
            this.onClose();
        };
        page.repaintPage = async () => {
            if (token !== this.transitionToken)
                return;
            this.emitCurrentRoute();
            await this.animateDrawerContentChange(token);
        };
    }

    protected onDeactivate(page: Page) {
        delete page.repaintPage;
        if (this.isNavigatingToDrawerChildRoute()) {
            this.pendingChildRouteSwap = true;
            this.createContentSnapshot(page);
            return;
        }
        this.pendingChildRouteSwap = false;
        this.activated.emit(null);
        void this.animateDrawerClose();
    }

    protected async onClose(startDelta?: number) {
        if (!this.routerOutlet().isActivated) return;
        await this.animateDrawerClose(startDelta);
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    private emitCurrentRoute() {
        const activatedRoute = this.routerOutlet().activatedRoute;
        const currentRoute = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
        this.activated.emit(currentRoute);
    }

    private getNavigationPath(): string {
        const navigation = this.router.getCurrentNavigation();
        const target = navigation?.finalUrl ?? navigation?.extractedUrl;
        const segments = target?.root.children['primary']?.segments;
        if (!segments)
            return '/';
        return '/' + segments.map(segment => segment.path).join('/');
    }

    private getParentRoutePath(): string {
        const segments = this.route.pathFromRoot
            .flatMap(route => route.snapshot.url.map(segment => segment.path))
            .filter(Boolean);
        if (segments.length === 0)
            return '/';
        return '/' + segments.join('/');
    }

    private isNavigatingToDrawerChildRoute(): boolean {
        const targetPath = this.getNavigationPath();
        const parentPath = this.getParentRoutePath();
        if (parentPath === '/')
            return targetPath !== '/';
        return targetPath.startsWith(`${parentPath}/`);
    }

    private getDrawerBodyElement(): HTMLElement | null {
        const drawer = this.drawerView();
        if (!drawer)
            return null;
        return drawer.nativeElement.querySelector('.drawer-body') as HTMLElement | null;
    }

    private createContentSnapshot(page: Page) {
        const drawerBody = this.getDrawerBodyElement();
        if (!drawerBody)
            return;
        this.clearContentSnapshot();
        const snapshot = page.el.cloneNode(true) as HTMLElement;
        snapshot.classList.add(DrawerRouterOutlet.contentSnapshotClass);
        snapshot.style.position = 'absolute';
        snapshot.style.inset = '0';
        snapshot.style.width = '100%';
        snapshot.style.pointerEvents = 'none';
        snapshot.style.zIndex = '999';
        snapshot.style.overflow = 'hidden';
        drawerBody.appendChild(snapshot);
        this.contentSnapshotEl = snapshot;
        this.setDrawerBodyMasked(true);
    }

    private clearContentSnapshot() {
        this.setDrawerBodyMasked(false);
        if (!this.contentSnapshotEl)
            return;
        this.contentSnapshotEl.remove();
        this.contentSnapshotEl = undefined;
    }

    private disconnectContentMaskObserver() {
        this.contentMaskObserver?.disconnect();
        this.contentMaskObserver = undefined;
    }

    private setDrawerBodyMasked(masked: boolean) {
        const drawerBody = this.getDrawerBodyElement();
        if (!drawerBody)
            return;

        const applyMask = () => {
            const children = Array.from(drawerBody.children) as HTMLElement[];
            for (const child of children) {
                if (child.classList.contains(DrawerRouterOutlet.contentSnapshotClass))
                    continue;
                if (masked)
                    child.style.visibility = 'hidden';
                else
                    child.style.removeProperty('visibility');
            }
        };

        if (masked) {
            applyMask();
            this.disconnectContentMaskObserver();
            const observer = new MutationObserver(() => applyMask());
            observer.observe(drawerBody, { childList: true });
            this.contentMaskObserver = observer;
            return;
        }

        this.disconnectContentMaskObserver();
        applyMask();
    }

    private async animateDrawerContentChange(token: number, onMidpoint?: () => void, midpointRatio = 0.25) {
        const clampedMidpointRatio = Math.max(0, Math.min(1, midpointRatio));
        this.contentChanging.set(true);
        this.contentChangeTimeout = clearTimeoutRef(this.contentChangeTimeout);
        this.contentChangeTimeout = window.setTimeout(() => {
            this.contentChangeTimeout = undefined;
            if (token !== this.transitionToken)
                return;
            this.contentChanging.set(false);
        }, animationDurationLgMs);
        await wait(animationDurationLgMs * clampedMidpointRatio);
        if (token !== this.transitionToken)
            return;
        onMidpoint?.();
    }

    private async animateDrawerOpen(token: number) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (token !== this.transitionToken)
            return;
        const element = this.drawerView().nativeElement;
        const card = getDrawerCard(element);
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
        if (token !== this.transitionToken)
            return;
            
        card.style.minWidth = '';
    }

    private async animateDrawerClose(startDelta?: number) {
        const page = this.activeChild();
        if (!page) return;
        this.clearContentSnapshot();
        this.closing.set(true);
        if (page instanceof RowPage)
            page.close();
        const element = this.drawerView().nativeElement;
        const card = getDrawerCard(element);
        if (this.onBottom()) {
            const height = element.offsetHeight;
            card.style.minHeight = `${height}px`;
            element.style.minHeight = `${height}px`;
            if (startDelta !== undefined && startDelta > 0) {
                element.style.transition = 'none';
                element.style.transform = `translateY(${startDelta}px)`;
                element.offsetHeight;
                element.style.transition = `transform ${animationDurationMs}ms ${easeOut}`;
                element.style.transform = 'translateY(100%)';
            } else {
                element.style.transform = '';
                element.style.transition = '';
            }
            await wait(animationDurationMs);
            card.style.minHeight = '';
            element.style.minHeight = '';
        } else {
            const width = element.offsetWidth;
            card.style.minWidth = `${width}px`;
            card.style.left = '0px';
            card.classList.add('fade-out');
            await transitionStyle(element, { width: `${width}px` }, { width: '0px' }, animationDurationLgMs, easeOut, true);
            card.classList.remove('fade-out');
        }
        resetDrawerVisualState(element, card);
        this.closing.set(false);
        if (this.contentChanging()) return;
        if (this.activeChild() === page)
            this.activeChild.set(null);
    }

    private snapBackDrawer(delta: number, isBottom: boolean) {
        const element = this.drawerView().nativeElement;
        element.style.transition = '';
        element.style.transform = `translate${isBottom ? 'Y' : 'X'}(${delta}px)`;
        if (!isBottom)
            element.style.opacity = calculateDragOpacity(delta);
        requestAnimationFrame(() => {
            element.style.transition = isBottom
                ? `transform ${animationDurationMs}ms ${easeOut}`
                : `transform ${animationDurationMs}ms ${easeOut}, opacity ${animationDurationMs}ms ${easeOut}`;
            element.style.transform = '';
            element.style.opacity = '';
            this.snapBackTimeout = clearTimeoutRef(this.snapBackTimeout);
            this.snapBackTimeout = window.setTimeout(() => {
                this.snapBackTimeout = undefined;
                element.style.transition = '';
            }, animationDurationMs);
        });
    }

    private cancelPendingAnimations(keepContentSnapshot = false) {
        this.contentChangeTimeout = clearTimeoutRef(this.contentChangeTimeout);
        this.snapBackTimeout = clearTimeoutRef(this.snapBackTimeout);
        this.dragController.cancelInteraction();
        this.contentChanging.set(false);
        this.closing.set(false);
        if (!keepContentSnapshot)
            this.clearContentSnapshot();
        const drawer = this.drawerView();
        if (!drawer)
            return;
        const element = drawer.nativeElement;
        const card = element.querySelector('.drawer-card') as HTMLElement | null;
        resetDrawerVisualState(element, card);
    }

    ngOnDestroy() {
        this.cancelPendingAnimations();
        this.disconnectContentMaskObserver();
        this.dragController.destroy();
    }
}