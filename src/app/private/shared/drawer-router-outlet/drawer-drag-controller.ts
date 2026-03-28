import { isCardBackground } from "./drawer-router-outlet.utils";

type DragState = {
    pointerId: number;
    axis: 'x' | 'y';
    startPos: number;
    lastPos: number;
    lastTime: number;
    delta: number;
    velocity: number;
    isDragActive: boolean;
};

type DrawerDragControllerOptions = {
    isBottom: () => boolean;
    setDragging: (dragging: boolean) => void;
    onPreview: (delta: number, isBottom: boolean) => void;
    onSnapBack: (delta: number, isBottom: boolean) => void;
    onClose: (delta: number, isBottom: boolean) => void;
};

export class DrawerDragController {

    private static readonly DRAG_THRESHOLD = 10;
    private static readonly CLOSE_DISTANCE = 100;
    private static readonly CLOSE_VELOCITY = 0.5;

    private element: HTMLElement | undefined;
    private abortController: AbortController | undefined;
    private dragState: DragState | undefined;
    private dragFrame: number | undefined;

    constructor(private readonly options: DrawerDragControllerOptions) {}

    attach(element: HTMLElement) {
        if (this.element === element)
            return;
        this.detach();
        this.element = element;

        this.abortController = new AbortController();
        const { signal } = this.abortController;
        element.addEventListener('pointerdown', this.onPointerDown, { passive: true, signal });
        element.addEventListener('pointermove', this.onPointerMove, { passive: false, signal });
        element.addEventListener('pointerup', this.onPointerUp, { passive: false, signal });
        element.addEventListener('pointercancel', this.onPointerCancel, { passive: true, signal });
    }

    cancelInteraction() {
        if (this.dragState)
            this.finishInteraction(this.dragState.pointerId);
        else
            this.options.setDragging(false);
    }

    detach() {
        this.abortController?.abort();
        this.abortController = undefined;
        this.cancelInteraction();
        this.element = undefined;
    }

    destroy() {
        this.detach();
    }

    private hasActivePointer(event: PointerEvent): boolean {
        return this.dragState !== undefined && event.pointerId === this.dragState.pointerId;
    }

    private canStartDrag(drawer: HTMLElement, target: HTMLElement, pointerType: string): boolean {
        const isDragHandle = target.closest('.drag-handle') !== null;
        if (isDragHandle)
            return true;
        const isBottom = this.options.isBottom();
        if (isBottom)
            return pointerType !== 'touch' && isCardBackground(target, drawer);
        return isCardBackground(target, drawer);
    }

    private readonly onPointerDown = (event: PointerEvent) => {
        const drawer = this.element;
        if (!drawer)
            return;
        if (event.button !== 0)
            return;
        if (this.dragState)
            return;

        const target = event.target as HTMLElement | null;
        if (!target)
            return;
        if (!this.canStartDrag(drawer, target, event.pointerType))
            return;

        const isBottom = this.options.isBottom();
        const axis = isBottom ? 'y' : 'x';
        const currentPos = axis === 'y' ? event.clientY : event.clientX;
        this.dragState = {
            pointerId: event.pointerId,
            axis,
            startPos: currentPos,
            lastPos: currentPos,
            lastTime: event.timeStamp,
            delta: 0,
            velocity: 0,
            isDragActive: false,
        };
        drawer.setPointerCapture(event.pointerId);
    };

    private readonly onPointerMove = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        const currentPos = state.axis === 'y' ? event.clientY : event.clientX;
        const rawDelta = currentPos - state.startPos;
        const delta = Math.max(0, rawDelta);
        const timeDelta = Math.max(1, event.timeStamp - state.lastTime);
        const instantVelocity = (currentPos - state.lastPos) / timeDelta;

        state.lastPos = currentPos;
        state.lastTime = event.timeStamp;
        state.velocity = state.velocity * 0.8 + instantVelocity * 0.2;

        if (!state.isDragActive) {
            if (rawDelta > DrawerDragController.DRAG_THRESHOLD)
                this.activateDrag(event);
            else
                return;
        }

        state.delta = delta;
        this.requestDragFrame();
        event.preventDefault();
    };

    private readonly onPointerUp = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        if (state.isDragActive) {
            const shouldClose = state.delta > DrawerDragController.CLOSE_DISTANCE
                || state.velocity > DrawerDragController.CLOSE_VELOCITY;
            this.completeInteraction(state, shouldClose);
            return;
        }
        this.completeInteraction(state, false);
    };

    private readonly onPointerCancel = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        this.completeInteraction(state, false);
    };

    private activateDrag(event: PointerEvent) {
        const state = this.dragState;
        if (!state || !this.element)
            return;
        state.isDragActive = true;
        this.options.setDragging(true);
        this.element.style.transition = '';
        this.element.style.userSelect = 'none';
        this.element.style.willChange = this.options.isBottom() ? 'transform' : 'transform, opacity';
        event.preventDefault();
    }

    private requestDragFrame() {
        if (this.dragFrame !== undefined)
            return;
        this.dragFrame = requestAnimationFrame(() => {
            this.dragFrame = undefined;
            const state = this.dragState;
            if (!state || !state.isDragActive)
                return;
            this.options.onPreview(state.delta, state.axis === 'y');
        });
    }

    private clearDragFrame() {
        if (this.dragFrame === undefined)
            return;
        cancelAnimationFrame(this.dragFrame);
        this.dragFrame = undefined;
    }

    private finishInteraction(pointerId: number) {
        if (this.element?.hasPointerCapture(pointerId))
            this.element.releasePointerCapture(pointerId);
        this.clearDragFrame();
        this.options.setDragging(false);
        if (this.element) {
            this.element.style.userSelect = '';
            this.element.style.willChange = '';
        }
        delete this.dragState;
    }

    private completeInteraction(state: DragState, shouldClose: boolean) {
        const isBottom = state.axis === 'y';
        this.finishInteraction(state.pointerId);
        if (shouldClose)
            this.options.onClose(state.delta, isBottom);
        else if (state.isDragActive)
            this.options.onSnapBack(state.delta, isBottom);
    }
}
