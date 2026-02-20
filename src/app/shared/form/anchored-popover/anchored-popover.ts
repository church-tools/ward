import { booleanAttribute, Component, DOCUMENT, ElementRef, inject, input, OnDestroy, output, viewChild } from "@angular/core";

export type PopoverPosition = 'top' | 'bottom' | 'anchor';
export type PopoverAlignment = 'left' | 'right' | 'center';

@Component({
    selector: 'app-anchored-popover',
    templateUrl: './anchored-popover.html',
    styleUrl: './anchored-popover.scss',
})
export class AnchoredPopoverComponent implements OnDestroy {

    private static nextAnchorId = 1;
    private readonly anchorId = AnchoredPopoverComponent.nextAnchorId++;
    readonly anchorNameCss = `--anchored-popover-${this.anchorId}`;

    private readonly document = inject<Document>(DOCUMENT);
    private readonly popover = viewChild.required('popover', { read: ElementRef });

    readonly position = input<PopoverPosition>('bottom');
    readonly alignment = input<PopoverAlignment>('right');
    readonly allowCickOutside = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly anchorElement = input<HTMLElement | null>(null);
    readonly offsetX = input<number>(0);
    readonly offsetY = input<number>(0);

    readonly visibilityChange = output<boolean>();

    private _visible = false;
    get visible() { return this._visible; }

    private readonly onDocumentPointerDown = (event: PointerEvent) => {
        if (!this._visible || this.allowCickOutside()) return;
        const popoverEl = this.popover().nativeElement as HTMLElement;
        const anchorEl = this.anchorElement();
        const target = event.target as Node | null;
        if (target && popoverEl.contains(target)) return;
        // Ignore clicks on the anchor element - let the anchor handle toggling
        if (target && anchorEl?.contains(target)) return;
        this.hide();
    };

    ngOnDestroy() {
        this.removeEventListeners();
    }

    show() {
        if (this._visible) return;
        this._visible = true;
        this.setPopoverVisibility(true);
        this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        this.visibilityChange.emit(true);
    }

    hide() {
        if (!this._visible) return;
        this._visible = false;
        this.setPopoverVisibility(false);
        this.removeEventListeners();
        this.visibilityChange.emit(false);
    }

    toggle() {
        if (this._visible) this.hide();
        else this.show();
    }

    private setPopoverVisibility(visible: boolean) {
        const element = this.popover().nativeElement as Element & { showPopover?: () => void; hidePopover?: () => void; };
        if (visible) {
            element.classList.remove('popover-closing');
            if (!element.matches(':popover-open'))
                element.showPopover?.();
            queueMicrotask(() => element.classList.add('popover-visible'));
        } else {
            element.classList.add('popover-closing');
            setTimeout(() => {
                if (element.classList.contains('popover-closing')) {
                    element.classList.remove('popover-visible');
                    element.hidePopover?.();
                }
            }, 200);
        }
    }

    private removeEventListeners() {
        this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    }
}
