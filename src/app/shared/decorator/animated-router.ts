import { Directive, inject, ViewContainerRef, Renderer2 } from "@angular/core";
import { PageComponent } from "../page/page";

@Directive({
    selector: 'router-outlet[appAnimatedRouter]',
    host: {
        '(activate)': 'onActivate($event)',
        '(deactivate)': 'onDeactivate($event)',
    },
})
export class AnimatedRouter {

    private readonly el = inject(ViewContainerRef).element.nativeElement;
    private readonly renderer = inject(Renderer2);
    
    protected onActivate(page: PageComponent): void {
        page.el.classList.add('router-page', 'enter');
        setTimeout(() => page.el.classList.remove('enter'), 300);
    }

    protected onDeactivate(page: PageComponent): void {
        // Instead of moving to parent, keep the clone in the same container as the original
        const container = this.el.parentElement as HTMLElement;
        
        if (!container) return;
        
        // Clone the element while it's still fully attached and styled
        const clone = page.el.cloneNode(true) as HTMLElement;
        
        // Position the clone exactly where the original was
        const rect = page.el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Set absolute positioning to match the original position
        // this.renderer.setStyle(clone, 'position', 'absolute');
        // this.renderer.setStyle(clone, 'top', `${rect.top - containerRect.top}px`);
        // this.renderer.setStyle(clone, 'left', `${rect.left - containerRect.left}px`);
        // this.renderer.setStyle(clone, 'width', `${rect.width}px`);
        // this.renderer.setStyle(clone, 'height', `${rect.height}px`);
        this.renderer.setStyle(clone, 'z-index', '1000');
        
        // Add the leave animation class
        clone.classList.add('leave');
        
        // Insert the clone in the same container, right after the original
        container.insertBefore(clone, page.el.nextSibling);
        
        // Remove the clone after animation completes
        setTimeout(() => {
            if (container.contains(clone)) {
                container.removeChild(clone);
            }
        }, 1000 * 100);
        
        // Let Angular remove the original component immediately
    }
}
