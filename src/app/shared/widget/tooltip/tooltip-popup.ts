import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, inject, input, signal, TemplateRef, ViewContainerRef, viewChild, OnDestroy } from "@angular/core";
import { xeffect } from "../../utils/signal-utils";

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tooltip that appears above selected text using CDK Overlay
 */

@Component({
    selector: 'app-tooltip-popup',
    template: `
        <ng-template #tooltipTemplate>
            <div class="tooltip acrylic-card" [class.fading]="fading()"
                (mouseenter)="show(true)" (mouseleave)="show(false)">
                <ng-content/>
            </div>
        </ng-template>
    `,
    styles: [`
        :host {
            display: contents;
        }
        
        .tooltip {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            color: var(--color-text);
            padding: 8px 12px;
            width: max-content;
            max-width: 300px;
            font-size: 0.875rem;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            z-index: 1000;
            position: relative;
            
            /* Small arrow pointing down to the selected text */
            &::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-top-color: var(--color-surface);
                filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
            }
            
            &.fading {
                animation: disappearDropdown 0.15s ease-out forwards;
            }
            
            &:not(.fading) {
                animation: appearDropdown 0.15s ease-out;
            }
        }
        
        @keyframes appearDropdown {
            from { 
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes disappearDropdown {
            from { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to { 
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
            }
        }
    `],
    host: {
        '(mouseenter)': 'show(true)',
        '(mouseleave)': 'show(false)',
    },
})
export class TooltipPopupComponent implements OnDestroy {

    protected readonly position = input<TooltipPosition>('bottom');
    protected readonly openOnHover = input(true);
    
    protected readonly visible = signal(false);
    protected readonly fading = signal(false);

    private readonly tooltipTemplate = viewChild.required<TemplateRef<any>>('tooltipTemplate');
    private readonly overlay = inject(Overlay);
    private readonly elementRef = inject(ElementRef);
    private readonly viewContainerRef = inject(ViewContainerRef);
    
    private overlayRef: OverlayRef | null = null;
    private portal: TemplatePortal | null = null;
    private shouldBeVisible = 0;
    private timeout: NodeJS.Timeout | undefined;

    constructor() {
        const parent: HTMLElement = this.elementRef.nativeElement.parentElement;
        if (!parent) return;
        
        // Setup interactions
        parent.addEventListener('click', () => this.toggle());
        parent.style.cursor = 'pointer';
        document.addEventListener('selectionchange', () => this.handleSelectionChange());
        
        // Setup hover if enabled
        xeffect([this.openOnHover], openOnHover => {
            const mouseEnter = () => this.show(true);
            const mouseLeave = () => this.show(false);
            if (openOnHover) {
                parent.addEventListener('mouseenter', mouseEnter);
                parent.addEventListener('mouseleave', mouseLeave);
            } else {
                parent.removeEventListener('mouseenter', mouseEnter);
                parent.removeEventListener('mouseleave', mouseLeave);
            }
        });

        // Create/destroy overlay
        xeffect([this.visible], visible => {
            if (visible && !this.overlayRef) {
                this.createOverlay();
            } else if (!visible && this.overlayRef) {
                this.closeOverlay();
            }
        });
    }

    ngOnDestroy() {
        this.closeOverlay();
        if (this.timeout) clearTimeout(this.timeout);
        document.removeEventListener('selectionchange', () => this.handleSelectionChange());
    }

    private handleSelectionChange() {
        const selection = window.getSelection();
        const parent = this.elementRef.nativeElement.parentElement;
        
        if (!selection || !parent || selection.rangeCount === 0) {
            this.show(false);
            return;
        }

        const range = selection.getRangeAt(0);
        if (!parent.contains(range.commonAncestorContainer)) {
            this.show(false);
            return;
        }

        this.show(selection.toString().trim().length > 0);
    }

    private createOverlay() {
        const selection = window.getSelection();
        const parent = this.elementRef.nativeElement.parentElement;
        
        if (!selection || !parent || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (!parent.contains(range.commonAncestorContainer)) return;

        const selectionRect = range.getBoundingClientRect();
        if (selectionRect.width === 0 && selectionRect.height === 0) return;

        // Calculate position
        const tooltipMaxWidth = 300;
        const tooltipHeight = 50;
        const padding = 16;
        
        let left = selectionRect.left + (selectionRect.width / 2) - (tooltipMaxWidth / 2);
        let top = selectionRect.top - tooltipHeight - 8;
        
        // Viewport constraints
        left = Math.max(padding, Math.min(window.innerWidth - tooltipMaxWidth - padding, left));
        if (top < padding) top = selectionRect.bottom + 8;
        if (top + tooltipHeight > window.innerHeight - padding) {
            top = selectionRect.top - tooltipHeight - 8;
        }

        const positionStrategy = this.overlay.position()
            .global()
            .left(`${Math.round(left)}px`)
            .top(`${Math.round(top)}px`);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.block(),
            hasBackdrop: false,
            panelClass: 'tooltip-overlay-panel',
            disposeOnNavigation: true
        });

        this.portal = new TemplatePortal(this.tooltipTemplate(), this.viewContainerRef);
        this.overlayRef.attach(this.portal);

        // Mouse events on overlay
        this.overlayRef.overlayElement.addEventListener('mouseenter', () => this.show(true));
        this.overlayRef.overlayElement.addEventListener('mouseleave', () => this.show(false));
    }

    private closeOverlay() {
        if (this.overlayRef) {
            this.overlayRef.detach();
            this.overlayRef.dispose();
            this.overlayRef = null;
            this.portal = null;
        }
    }

    protected toggle() {
        this.shouldBeVisible = this.visible() ? 0 : 1;
        this.setVisibility(this.shouldBeVisible > 0);
    }

    protected show(show: boolean) {
        this.shouldBeVisible += show ? 1 : -1;
        if (this.timeout) clearTimeout(this.timeout);
        
        const delay = show ? 0 : 200;
        this.timeout = setTimeout(() => this.setVisibility(this.shouldBeVisible > 0), delay);
    }

    private setVisibility(visible: boolean) {
        if (this.visible() === visible) return;
        
        if (visible) {
            this.visible.set(true);
            this.fading.set(false);
        } else {
            this.fading.set(true);
            setTimeout(() => {
                this.visible.set(false);
                this.fading.set(false);
            }, 100);
        }
    }
}