import { Button } from '@/shared/form/button/button';
import { HorizontalDragGesture } from '@/shared/form/shared/horizontal-drag-gesture';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { xsignal } from '@/shared/utils/signal-utils';
import { AfterViewInit, booleanAttribute, Component, computed, ElementRef, inject, input, OnChanges, OnDestroy, OnInit, viewChild } from '@angular/core';

export type PanelPoint = { x: number; y: number };

@Component({
    selector: 'app-edge-panel',
    templateUrl: './edge-panel.html',
    styleUrl: './edge-panel.scss',
    imports: [Button, LocalizePipe],
    host: {
        '[class.right]': "edge() === 'right'",
        '[class.open]': 'open()',
        '[class.hidden]': '!visible()',
        '[attr.inert]': 'visible() ? null : ""',
        '[class.sliding]': 'translation() !== null',
        '[style.--edge-panel-width]': 'width()',
        '[style.--edge-panel-peek.px]': 'peek',
        '(document:pointermove)': 'slide.onPointerMove($event)',
        '(document:pointerup)': 'slide.onPointerUp($event)',
        '(document:pointercancel)': 'slide.onPointerCancel($event)',
        '(window:resize)': 'measureContainer()',
    },
})
export class EdgePanel implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    readonly edge = input<'left' | 'right'>('left');
    readonly width = input('18rem');
    readonly storageKey = input.required<string>();
    readonly dragPosition = input<PanelPoint | null>(null);
    readonly visible = input(true, { transform: booleanAttribute });

    protected readonly peek = 24;
    protected readonly pinned = xsignal(false);
    protected readonly expanded = xsignal(false);
    protected readonly hovered = xsignal(false);
    protected readonly focused = xsignal(false);
    protected readonly translation = xsignal<number | null>(null);
    protected readonly open = computed(() => this.visible() && (this.pinned() || this.expanded() || this.hovered()
        || this.focused() || this.nearDrag()));
    private readonly slot = viewChild<ElementRef<HTMLElement>>('slot');
    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private container: Element | null = null;
    private observer?: ResizeObserver;
    private startX = 0;
    private startReveal = 0;
    private travel = 0;

    protected readonly slide = new HorizontalDragGesture({
        getElement: () => this.card().nativeElement,
        thresholdPx: 8,
        onDown: x => {
            this.startX = x;
            this.travel = Math.max(0, this.slot()!.nativeElement.getBoundingClientRect().width - this.peek);
            this.startReveal = this.open() ? this.travel : 0;
        },
        onMove: (x, moved, event) => {
            if (!moved || !this.visible()) return;
            this.translation.set((this.revealAt(x) - this.travel) * this.direction());
            event.preventDefault();
        },
        onEnd: (x, moved) => {
            if (this.visible()) {
                if (moved) this.setExpanded(this.revealAt(x) > this.travel / 2);
                else this.expanded.set(true);
            }
            this.translation.set(null);
        },
        onCancel: () => this.translation.set(null),
    });

    ngOnInit(): void {
        try {
            this.pinned.set(localStorage.getItem(`edge-panel:${this.storageKey()}`) === 'true');
        } catch { /* The panel still works when storage is unavailable. */ }
    }

    ngOnChanges(): void {
        if (this.visible()) return;
        this.hovered.set(false);
        this.focused.set(false);
        this.expanded.set(false);
        this.translation.set(null);
    }

    ngAfterViewInit(): void {
        this.container = this.host.nativeElement.closest('.canvas-container');
        this.measureContainer();
        if (this.container) {
            this.observer = new ResizeObserver(() => this.measureContainer());
            this.observer.observe(this.container);
        }
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }

    protected measureContainer(): void {
        if (!this.container) return;
        const box = this.container.getBoundingClientRect();
        Object.assign(this.host.nativeElement.style, {
            top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px`,
        });
    }

    /** Test the visible card, not the portion clipped outside the canvas or covered by a dialog. */
    contains(point: PanelPoint): boolean {
        if (!this.visible()) return false;
        const target = document.elementFromPoint(point.x, point.y);
        return target !== null && this.card().nativeElement.contains(target);
    }

    protected onPointerDown(event: PointerEvent): void {
        const target = event.target;
        if (!this.visible() || !(target instanceof Element) || this.dragPosition()
            || target.closest('button,a,input,textarea,select,label,[contenteditable],.cdk-drag,[role="button"]')) return;
        this.slide.onPointerDown(event);
    }

    protected onPointerEnter(event: PointerEvent): void {
        if (this.visible() && event.pointerType !== 'touch') this.hovered.set(true);
    }

    protected onPointerLeave(event: PointerEvent): void {
        if (event.pointerType === 'touch') return;
        this.hovered.set(false);
        this.expanded.set(false);
    }

    protected onFocusOut(event: FocusEvent): void {
        if (!(event.relatedTarget instanceof Node) || !this.host.nativeElement.contains(event.relatedTarget)) {
            this.focused.set(false);
            this.expanded.set(false);
        }
    }

    protected onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.card().nativeElement.focus();
            this.setExpanded(false);
        } else if (event.target === this.card().nativeElement && (event.key === 'Enter' || event.key === ' ')) {
            this.togglePin();
        } else return;
        event.preventDefault();
        event.stopPropagation();
    }

    protected togglePin(): void {
        this.savePin(!this.pinned());
    }

    private setExpanded(open: boolean): void {
        this.expanded.set(open);
        if (!open) {
            this.hovered.set(false);
            this.focused.set(false);
            this.savePin(false);
        }
    }

    private savePin(pinned: boolean): void {
        this.pinned.set(pinned);
        try {
            localStorage.setItem(`edge-panel:${this.storageKey()}`, String(pinned));
        } catch { /* Keep the pin for this visit if storage is unavailable. */ }
    }

    private direction(): number {
        return this.edge() === 'left' ? 1 : -1;
    }

    private revealAt(x: number): number {
        return Math.max(0, Math.min(this.travel, this.startReveal + (x - this.startX) * this.direction()));
    }

    private nearDrag(): boolean {
        const point = this.dragPosition();
        const box = this.slot()?.nativeElement.getBoundingClientRect();
        return !!point && !!box && point.x >= box.left && point.x <= box.right
            && point.y >= box.top && point.y <= box.bottom;
    }
}
