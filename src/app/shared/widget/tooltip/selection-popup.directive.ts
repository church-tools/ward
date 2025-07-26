import { Directive, ElementRef, inject, TemplateRef, ViewContainerRef, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

/**
 * Directive that shows a popup when text is selected within the host element
 */
@Directive({
    selector: '[appSelectionPopup]'
})
export class SelectionPopupDirective implements OnDestroy {
    
    private readonly overlay = inject(Overlay);
    private readonly elementRef = inject(ElementRef);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly templateRef = inject(TemplateRef);
    
    private overlayRef: OverlayRef | null = null;
    private portal: TemplatePortal | null = null;

    constructor() {
        document.addEventListener('selectionchange', () => this.handleSelectionChange());
    }

    ngOnDestroy() {
        this.closeOverlay();
        document.removeEventListener('selectionchange', () => this.handleSelectionChange());
    }

    private handleSelectionChange() {
        const selection = window.getSelection();
        const host = this.elementRef.nativeElement;
        
        if (!selection || selection.rangeCount === 0) {
            this.closeOverlay();
            return;
        }

        const range = selection.getRangeAt(0);
        
        // Check if selection is within our host element
        if (!host.contains(range.commonAncestorContainer) || selection.toString().trim().length === 0) {
            this.closeOverlay();
            return;
        }

        this.createOverlay(range);
    }

    private createOverlay(range: Range) {
        this.closeOverlay();

        const selectionRect = range.getBoundingClientRect();
        if (selectionRect.width === 0 && selectionRect.height === 0) return;

        const left = selectionRect.left + (selectionRect.width / 2);
        const top = selectionRect.top - 50;

        const positionStrategy = this.overlay.position()
            .global()
            .left(`${Math.round(left)}px`)
            .top(`${Math.round(top)}px`);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.block(),
            hasBackdrop: false,
            panelClass: 'selection-popup-overlay'
        });

        this.portal = new TemplatePortal(this.templateRef, this.viewContainerRef);
        this.overlayRef.attach(this.portal);
    }

    private closeOverlay() {
        if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
            this.overlayRef = null;
            this.portal = null;
        }
    }
}
