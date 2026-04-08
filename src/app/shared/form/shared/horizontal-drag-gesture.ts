type HorizontalDragState = {
    pointerId: number;
    startX: number;
    moved: boolean;
    captured: boolean;
};

type HorizontalDragCallbacks = {
    getElement: () => HTMLElement | undefined;
    onDown?: (clientX: number, event: PointerEvent) => void;
    onMove?: (clientX: number, moved: boolean, event: PointerEvent) => void;
    onEnd?: (clientX: number, moved: boolean, event: PointerEvent) => void;
    onCancel?: (moved: boolean, event: PointerEvent) => void;
    thresholdPx?: number;
};

export class HorizontalDragGesture {

    private readonly thresholdPx: number;
    private state: HorizontalDragState | null = null;

    constructor(private readonly callbacks: HorizontalDragCallbacks) {
        this.thresholdPx = callbacks.thresholdPx ?? 4;
    }

    onPointerDown(event: PointerEvent): void {
        if (event.button !== 0 && event.pointerType !== 'touch')
            return;
        if (this.state)
            return;

        this.state = {
            pointerId: event.pointerId,
            startX: event.clientX,
            moved: false,
            captured: false,
        };

        this.callbacks.onDown?.(event.clientX, event);
    }

    onPointerMove(event: PointerEvent): void {
        const state = this.state;
        if (!state || state.pointerId !== event.pointerId)
            return;

        const wasMoved = state.moved;
        this.updateMovedState(state, event.clientX);
        if (!wasMoved && state.moved)
            this.capturePointer(state);
        this.callbacks.onMove?.(event.clientX, state.moved, event);
    }

    onPointerUp(event: PointerEvent): void {
        const state = this.state;
        if (!state || state.pointerId !== event.pointerId)
            return;

        this.updateMovedState(state, event.clientX);
        this.callbacks.onEnd?.(event.clientX, state.moved, event);
        this.clear();
    }

    onPointerCancel(event: PointerEvent): void {
        const state = this.state;
        if (!state || state.pointerId !== event.pointerId)
            return;

        this.callbacks.onCancel?.(state.moved, event);
        this.clear();
    }

    private updateMovedState(state: HorizontalDragState, clientX: number): void {
        if (!state.moved && Math.abs(clientX - state.startX) > this.thresholdPx)
            state.moved = true;
    }

    private capturePointer(state: HorizontalDragState): void {
        if (state.captured)
            return;
        const element = this.callbacks.getElement();
        if (!element)
            return;
        element.setPointerCapture(state.pointerId);
        state.captured = true;
    }

    private clear() {
        const state = this.state;
        if (!state)
            return;
        if (state.captured) {
            const element = this.callbacks.getElement();
            if (element?.hasPointerCapture(state.pointerId))
                element.releasePointerCapture(state.pointerId);
        }
        this.state = null;
    }
}