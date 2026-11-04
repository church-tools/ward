import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExpandableCard from './expandable-card';

// jsdom has no ResizeObserver; the collapse only uses it to follow late content.
class StubResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}
globalThis.ResizeObserver ??= StubResizeObserver as unknown as typeof ResizeObserver;

@Component({
    imports: [ExpandableCard],
    template: `
        <app-expandable-card [expanded]="expanded()">
            <span cardHeader>header</span>
            <span class="body">body</span>
        </app-expandable-card>`,
})
class Host {
    readonly expanded = signal(false);
}

describe('ExpandableCard', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
    let host: HTMLElement;

    const body = () => host.querySelector('.body');

    beforeEach(() => {
        vi.useFakeTimers();
        fixture = TestBed.createComponent(Host);
        host = fixture.nativeElement as HTMLElement;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        vi.useRealTimers();
    });

    it('does not build its body while collapsed', () => {
        expect(body()).toBeNull();
    });

    it('builds the body as soon as it expands', () => {
        fixture.componentInstance.expanded.set(true);
        fixture.detectChanges();
        expect(body()).not.toBeNull();
    });

    it('keeps the body until the collapse animation finished', async () => {
        const component = fixture.componentInstance;
        component.expanded.set(true);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(600);

        component.expanded.set(false);
        fixture.detectChanges();
        expect(body()).not.toBeNull();

        await vi.advanceTimersByTimeAsync(600);
        fixture.detectChanges();
        expect(body()).toBeNull();
    });
});
