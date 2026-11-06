import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgePanel } from './edge-panel';

@Component({
    imports: [EdgePanel],
    template: `<app-edge-panel storageKey="test-panel" [visible]="visible()">
        <p class="heading">Heading</p>
        <button class="control">Control</button><div class="cdk-drag">Draggable content</div>
    </app-edge-panel>`,
})
class Host {
    readonly visible = signal(true);
    readonly panel = viewChild.required(EdgePanel);
}

describe('EdgePanel', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
    let panel: HTMLElement;
    let card: HTMLElement;
    let slot: HTMLElement;

    function pointer(type: string, x = 100, pointerType = 'mouse', pointerId = 1): MouseEvent {
        const event = new MouseEvent(type, { bubbles: type !== 'pointerenter' && type !== 'pointerleave', cancelable: true, clientX: x, clientY: 200 });
        Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: pointerId } });
        return event;
    }
    const isOpen = () => panel.classList.contains('open');
    const pin = () => (panel.querySelector('app-button button') as HTMLButtonElement).click();

    beforeEach(async () => {
        localStorage.clear();
        fixture = TestBed.createComponent(Host);
        await fixture.whenStable();
        panel = fixture.nativeElement.querySelector('app-edge-panel');
        card = panel.querySelector('.panel-card')!;
        card.getBoundingClientRect = () => new DOMRect(100, 100, 200, 300);
        slot = panel.querySelector('.slot')!;
        slot.getBoundingClientRect = () => new DOMRect(84, 100, 216, 300);
        card.setPointerCapture = vi.fn();
        card.hasPointerCapture = () => true;
        card.releasePointerCapture = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('keeps a peek, reveals on mouse hover, and closes on leave', async () => {
        expect(isOpen()).toBe(false);
        expect(panel.style.getPropertyValue('--edge-panel-peek')).toBe('24px');
        expect(card.classList.contains('acrylic-card')).toBe(true);
        slot.dispatchEvent(pointer('pointerenter'));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
        slot.dispatchEvent(pointer('pointerleave', 900));
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
    });

    it('keeps the panel open across the gap without treating the gap as a drop target', async () => {
        slot.dispatchEvent(pointer('pointerenter', 90));
        await fixture.whenStable();
        card.dispatchEvent(pointer('pointerleave', 90));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => slot });
        expect(fixture.componentInstance.panel().contains({ x: 90, y: 200 })).toBe(false);
        slot.dispatchEvent(pointer('pointerleave', 80));
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
    });

    it('fully hides and disables the panel, clearing transient hover before showing it again', async () => {
        slot.dispatchEvent(pointer('pointerenter'));
        await fixture.whenStable();
        fixture.componentInstance.visible.set(false);
        await fixture.whenStable();
        expect(panel.classList.contains('hidden')).toBe(true);
        expect(panel.hasAttribute('inert')).toBe(true);
        expect(isOpen()).toBe(false);
        expect(fixture.componentInstance.panel().contains({ x: 150, y: 200 })).toBe(false);
        slot.dispatchEvent(pointer('pointerenter'));
        fixture.componentInstance.visible.set(true);
        await fixture.whenStable();
        expect(panel.classList.contains('hidden')).toBe(false);
        expect(panel.hasAttribute('inert')).toBe(false);
        expect(isOpen()).toBe(false);
    });

    it('visibility overrides a pin without forgetting it', async () => {
        pin();
        await fixture.whenStable();
        fixture.componentInstance.visible.set(false);
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
        expect(localStorage.getItem('edge-panel:test-panel')).toBe('true');
        fixture.componentInstance.visible.set(true);
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
    });

    it('includes the inset in the slide distance so the closed peek stays at the canvas edge', async () => {
        card.dispatchEvent(pointer('pointerdown', 100, 'touch'));
        document.dispatchEvent(pointer('pointermove', 120, 'touch'));
        await fixture.whenStable();
        expect(card.style.translate).toBe('-172px'); // 216px slot - 24px peek - 20px movement
        document.dispatchEvent(pointer('pointercancel', 120, 'touch'));
    });

    it('does not treat touch as hover; a tap opens it', async () => {
        slot.dispatchEvent(pointer('pointerenter', 100, 'touch'));
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
        card.dispatchEvent(pointer('pointerdown', 100, 'touch'));
        document.dispatchEvent(pointer('pointerup', 100, 'touch'));
        slot.dispatchEvent(pointer('pointerleave', 100, 'touch'));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
    });

    it('does not close focused content when the mouse leaves', async () => {
        card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        slot.dispatchEvent(pointer('pointerleave', 900));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
        card.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
    });

    it('pins by keyboard, restores the pin, and Escape closes it', async () => {
        card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await fixture.whenStable();
        expect(localStorage.getItem('edge-panel:test-panel')).toBe('true');
        fixture.destroy();
        fixture = TestBed.createComponent(Host);
        await fixture.whenStable();
        panel = fixture.nativeElement.querySelector('app-edge-panel');
        card = panel.querySelector('.panel-card')!;
        expect(isOpen()).toBe(true);
        card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await fixture.whenStable();
        expect(isOpen()).toBe(false);
        expect(localStorage.getItem('edge-panel:test-panel')).toBe('false');
    });

    it('still pins when storage is denied', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
        pin();
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
    });

    it('opens only when a dragged item approaches its slot', async () => {
        const component = TestBed.createComponent(EdgePanel);
        component.componentRef.setInput('storageKey', 'proximity');
        await component.whenStable();
        component.nativeElement.querySelector('.slot').getBoundingClientRect = () => new DOMRect(100, 100, 200, 300);
        component.componentRef.setInput('dragPosition', { x: 700, y: 200 });
        await component.whenStable();
        expect(component.nativeElement.classList.contains('open')).toBe(false);
        component.componentRef.setInput('dragPosition', { x: 110, y: 200 });
        await component.whenStable();
        expect(component.nativeElement.classList.contains('open')).toBe(true);
        component.componentRef.setInput('dragPosition', null);
        await component.whenStable();
        expect(component.nativeElement.classList.contains('open')).toBe(false);
        component.destroy();
    });

    it.each(['left', 'right'] as const)('slides a %s panel by touch and unpins when dragged shut', async edge => {
        // The host uses the default edge; a separate instance lets this exercise both directions.
        const component = TestBed.createComponent(EdgePanel);
        component.componentRef.setInput('storageKey', 'slide');
        component.componentRef.setInput('edge', edge);
        await component.whenStable();
        const surface: HTMLElement = component.nativeElement.querySelector('.panel-card');
        surface.getBoundingClientRect = () => new DOMRect(100, 100, 200, 300);
        component.nativeElement.querySelector('.slot').getBoundingClientRect = () => new DOMRect(84, 100, 216, 300);
        surface.setPointerCapture = vi.fn();
        surface.hasPointerCapture = () => true;
        surface.releasePointerCapture = vi.fn();
        const direction = edge === 'left' ? 1 : -1;
        surface.dispatchEvent(pointer('pointerdown', 200, 'touch'));
        document.dispatchEvent(pointer('pointermove', 200 + direction * 120, 'touch'));
        document.dispatchEvent(pointer('pointerup', 200 + direction * 120, 'touch'));
        await component.whenStable();
        expect(component.nativeElement.classList.contains('open')).toBe(true);
        (component.nativeElement.querySelector('app-button button') as HTMLButtonElement).click();
        surface.dispatchEvent(pointer('pointerdown', 200, 'touch'));
        document.dispatchEvent(pointer('pointermove', 200 - direction * 120, 'touch'));
        document.dispatchEvent(pointer('pointerup', 200 - direction * 120, 'touch'));
        await component.whenStable();
        expect(component.nativeElement.classList.contains('open')).toBe(false);
        expect(localStorage.getItem('edge-panel:slide')).toBe('false');
        component.destroy();
    });

    it('keeps sliding when touch capture transfers from a descendant to the card', async () => {
        const heading = panel.querySelector('.heading')!;
        heading.dispatchEvent(pointer('pointerdown', 100, 'touch'));
        document.dispatchEvent(pointer('pointermove', 220, 'touch'));
        heading.dispatchEvent(pointer('lostpointercapture', 220, 'touch'));
        await fixture.whenStable();
        expect(panel.classList.contains('sliding')).toBe(true);
        document.dispatchEvent(pointer('pointerup', 220, 'touch'));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
    });

    it.each(['pointercancel', 'lostpointercapture'])('restores a pinned panel on %s and ignores another pointer', async cancellation => {
        pin();
        await fixture.whenStable();
        card.dispatchEvent(pointer('pointerdown', 200));
        document.dispatchEvent(pointer('pointermove', 60, 'mouse', 2));
        await fixture.whenStable();
        expect(panel.classList.contains('sliding')).toBe(false);
        document.dispatchEvent(pointer('pointermove', 60));
        await fixture.whenStable();
        expect(panel.classList.contains('sliding')).toBe(true);
        card.dispatchEvent(pointer(cancellation, 60));
        await fixture.whenStable();
        expect(panel.classList.contains('sliding')).toBe(false);
        expect(isOpen()).toBe(true);
    });

    it.each(['.control', '.cdk-drag'])('leaves %s gestures to their owner', async selector => {
        pin();
        await fixture.whenStable();
        panel.querySelector(selector)!.dispatchEvent(pointer('pointerdown', 200));
        document.dispatchEvent(pointer('pointermove', 60));
        document.dispatchEvent(pointer('pointerup', 60));
        await fixture.whenStable();
        expect(isOpen()).toBe(true);
        expect(card.setPointerCapture).not.toHaveBeenCalled();
    });

    it('tracks its nearest canvas including the bottom navigation boundary and disconnects on destroy', async () => {
        let resize = () => {};
        const disconnect = vi.fn();
        vi.stubGlobal('ResizeObserver', class {
            constructor(callback: () => void) { resize = callback; }
            observe = vi.fn();
            disconnect = disconnect;
        });
        const container = document.createElement('div');
        container.className = 'canvas-container';
        let box = new DOMRect(70, 49, 700, 550);
        container.getBoundingClientRect = () => box;
        const component = TestBed.createComponent(EdgePanel);
        component.componentRef.setInput('storageKey', 'bounds');
        container.append(component.nativeElement);
        await component.whenStable();
        expect(component.nativeElement.style.top).toBe('49px');
        expect(component.nativeElement.style.left).toBe('70px');
        expect(component.nativeElement.style.height).toBe('550px');
        box = new DOMRect(0, 49, 400, 480);
        resize();
        expect(component.nativeElement.style.left).toBe('0px');
        expect(component.nativeElement.style.width).toBe('400px');
        expect(component.nativeElement.style.height).toBe('480px');
        component.destroy();
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it('uses live browser hit testing for clipped content and overlays', () => {
        const hit = vi.fn().mockReturnValue(card);
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
        expect(fixture.componentInstance.panel().contains({ x: 100, y: 200 })).toBe(true);
        hit.mockReturnValue(document.body);
        expect(fixture.componentInstance.panel().contains({ x: 100, y: 200 })).toBe(false);
    });
});
