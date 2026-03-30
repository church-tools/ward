import { isCardBackground } from "./drawer-router-outlet.utils";

type BaseDragState = {
    kind: 'pointer' | 'touch';
    pointerId: number;
    axis: 'x' | 'y';
    startPos: number;
    lastPos: number;
    lastTime: number;
    delta: number;
    velocity: number;
    isDragActive: boolean;
    activationThreshold: number;
};

type PointerDragState = BaseDragState & {
    kind: 'pointer';
};

type TouchDragState = BaseDragState & {
    kind: 'touch';
    touch: {
        startTarget: HTMLElement | null;
        restoreClickOnTap: boolean;
        startedOnHandle: boolean;
        scrollContainer: HTMLElement | null;
        requiresTopScrollForActivation: boolean;
    };
};

type DragState = PointerDragState | TouchDragState;

type DrawerDragControllerOptions = {
    isBottom: () => boolean;
    setDragging: (dragging: boolean) => void;
    onPreview: (delta: number, isBottom: boolean) => void;
    onSnapBack: (delta: number, isBottom: boolean) => void;
    onClose: (delta: number, isBottom: boolean) => void;
};

export class DrawerDragController {

    private static readonly DRAG_THRESHOLD = 10;
    private static readonly TOUCH_EDITABLE_THRESHOLD = 8;
    private static readonly TAP_MOVE_THRESHOLD = DrawerDragController.TOUCH_EDITABLE_THRESHOLD;
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
        element.addEventListener('pointerdown', this.onPointerDown, { passive: false, signal });
        element.addEventListener('pointermove', this.onPointerMove, { passive: false, signal });
        element.addEventListener('pointerup', this.onPointerUp, { passive: false, signal });
        element.addEventListener('pointercancel', this.onPointerCancel, { passive: true, signal });
        element.addEventListener('touchstart', this.onTouchStart, { passive: false, signal });
        element.addEventListener('touchmove', this.onTouchMove, { passive: false, signal });
        element.addEventListener('touchend', this.onTouchEnd, { passive: true, signal });
        element.addEventListener('touchcancel', this.onTouchCancel, { passive: true, signal });
    }

    cancelInteraction() {
        if (this.dragState)
            this.finishInteraction(this.dragState);
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
        return this.dragState !== undefined
            && this.dragState.kind === 'pointer'
            && event.pointerId === this.dragState.pointerId;
    }

    private isInteractiveTarget(target: HTMLElement): boolean {
        return target.closest('button,a,input,textarea,select,label,[contenteditable]') !== null;
    }

    private isEditableTarget(target: HTMLElement): boolean {
        return target.closest('input, textarea, select, [contenteditable]') !== null;
    }

    private getTouchActivationThreshold(isEditableStart: boolean): number {
        return isEditableStart ? DrawerDragController.TOUCH_EDITABLE_THRESHOLD : 0;
    }

    private canStartDrag(drawer: HTMLElement, target: HTMLElement): boolean {
        const isDragHandle = target.closest('.drag-handle') !== null;
        if (isDragHandle)
            return true;
        if (this.isEditableTarget(target))
            return true;
        return isCardBackground(target, drawer);
    }

    private getScrollContainer(target: HTMLElement): HTMLElement | null {
        return target.closest('.drawer-card') as HTMLElement | null;
    }

    private canActivateBottomTouchBodyDrag(state: TouchDragState, rawDelta: number): boolean {
        if (rawDelta <= state.activationThreshold)
            return false;
        if (rawDelta <= 0)
            return false;
        if (state.touch.startedOnHandle)
            return true;
        if (!state.touch.requiresTopScrollForActivation)
            return true;
        return (state.touch.scrollContainer?.scrollTop ?? 0) <= 1;
    }

    private updateMotionState(state: DragState, currentPos: number, timeStamp: number): number {
        const timeDelta = Math.max(1, timeStamp - state.lastTime);
        const instantVelocity = (currentPos - state.lastPos) / timeDelta;
        state.lastPos = currentPos;
        state.lastTime = timeStamp;
        state.velocity = state.velocity * 0.8 + instantVelocity * 0.2;
        state.delta = Math.max(0, currentPos - state.startPos);
        return currentPos - state.startPos;
    }

    private restoreTapIfNeeded(state: TouchDragState) {
        const startTarget = state.touch.startTarget;
        const moved = Math.abs(state.lastPos - state.startPos);
        const shouldRestoreTap = state.touch.restoreClickOnTap && startTarget && moved <= DrawerDragController.TAP_MOVE_THRESHOLD;
        if (!shouldRestoreTap || !startTarget)
            return;
        try {
            const tag = startTarget.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea')
                (startTarget as HTMLInputElement).focus();
            if (typeof (startTarget as HTMLElement).click === 'function')
                (startTarget as HTMLElement).click();
        } catch (_e) {
            // best-effort; ignore failures
        }
    }

    private findTrackedTouch(event: TouchEvent, pointerId: number): Touch | undefined {
        for (const touch of Array.from(event.changedTouches)) {
            if (touch.identifier === pointerId)
                return touch;
        }
        return undefined;
    }

    private readonly onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'touch')
            return;
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
        if (!this.canStartDrag(drawer, target))
            return;

        const isDragHandle = target.closest('.drag-handle') !== null;
        const isEditableStart = this.isEditableTarget(target);
        const isBottom = this.options.isBottom();

        const axis = isBottom ? 'y' : 'x';
        const currentPos = axis === 'y' ? event.clientY : event.clientX;
        this.dragState = {
            kind: 'pointer',
            pointerId: event.pointerId,
            axis,
            startPos: currentPos,
            lastPos: currentPos,
            lastTime: event.timeStamp,
            delta: 0,
            velocity: 0,
            isDragActive: false,
            activationThreshold: DrawerDragController.DRAG_THRESHOLD,
        };
        drawer.setPointerCapture(event.pointerId);
    };

    private readonly onTouchStart = (event: TouchEvent) => {
        const drawer = this.element;
        if (!drawer)
            return;
        if (this.dragState)
            return;

        const touch = event.changedTouches.item(0);
        if (!touch)
            return;

        const target = event.target as HTMLElement | null;
        if (!target)
            return;
        if (!this.canStartDrag(drawer, target))
            return;

        const drawerBody = target.closest('.drawer-body') as HTMLElement | null;
        const startsOnBodySurface = drawerBody !== null && target === drawerBody;
        const isDragHandle = target.closest('.drag-handle') !== null;
        const isEditableStart = this.isEditableTarget(target);
        const isInteractiveStart = this.isInteractiveTarget(target);
        const isBottom = this.options.isBottom();
        const shouldCaptureOnStart = !isBottom
            || isDragHandle
            || isInteractiveStart
            || !startsOnBodySurface;

        if (shouldCaptureOnStart && event.cancelable)
            event.preventDefault();

        const axis = isBottom ? 'y' : 'x';
        const currentPos = axis === 'y' ? touch.clientY : touch.clientX;
        this.dragState = {
            kind: 'touch',
            pointerId: touch.identifier,
            axis,
            startPos: currentPos,
            lastPos: currentPos,
            lastTime: event.timeStamp,
            delta: 0,
            velocity: 0,
            isDragActive: false,
            activationThreshold: this.getTouchActivationThreshold(isEditableStart),
            touch: {
                startTarget: target,
                restoreClickOnTap: shouldCaptureOnStart && isInteractiveStart,
                startedOnHandle: isDragHandle,
                scrollContainer: this.getScrollContainer(target),
                requiresTopScrollForActivation: isBottom && startsOnBodySurface,
            },
        };
    };

    private readonly onPointerMove = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        const currentPos = state.axis === 'y' ? event.clientY : event.clientX;
        const rawDelta = this.updateMotionState(state, currentPos, event.timeStamp);

        if (!state.isDragActive) {
            if (rawDelta > state.activationThreshold)
                this.activateDrag(() => event.preventDefault());
            else
                return;
        }

        this.requestDragFrame();
        event.preventDefault();
    };

    private readonly onTouchMove = (event: TouchEvent) => {
        const state = this.dragState;
        if (!state || state.kind !== 'touch')
            return;
        const touch = this.findTrackedTouch(event, state.pointerId);
        if (!touch)
            return;

        const currentPos = state.axis === 'y' ? touch.clientY : touch.clientX;
        const rawDelta = this.updateMotionState(state, currentPos, event.timeStamp);

        if (!state.isDragActive) {
            const shouldActivate = state.axis === 'y'
                ? this.canActivateBottomTouchBodyDrag(state, rawDelta)
                : rawDelta > state.activationThreshold;
            if (shouldActivate)
                this.activateDrag(() => event.cancelable && event.preventDefault());
            else
                return;
        }

        this.requestDragFrame();
        if (event.cancelable)
            event.preventDefault();
    };

    private readonly onPointerUp = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        const currentPos = state.axis === 'y' ? event.clientY : event.clientX;
        this.updateMotionState(state, currentPos, event.timeStamp);
        if (state.isDragActive) {
            const shouldClose = state.delta > DrawerDragController.CLOSE_DISTANCE
                || state.velocity > DrawerDragController.CLOSE_VELOCITY;
            this.completeInteraction(state, shouldClose);
            return;
        }
        this.completeInteraction(state, false);
    };

    private readonly onTouchEnd = (event: TouchEvent) => {
        const state = this.dragState;
        if (!state || state.kind !== 'touch')
            return;
        const touchState: TouchDragState = state;
        const touch = this.findTrackedTouch(event, touchState.pointerId);
        if (!touch)
            return;

        const currentPos = touchState.axis === 'y' ? touch.clientY : touch.clientX;
        this.updateMotionState(touchState, currentPos, event.timeStamp);

        if (touchState.isDragActive) {
            const shouldClose = touchState.delta > DrawerDragController.CLOSE_DISTANCE
                || touchState.velocity > DrawerDragController.CLOSE_VELOCITY;
            this.completeInteraction(touchState, shouldClose);
            return;
        }

        this.completeInteraction(touchState, false);
        this.restoreTapIfNeeded(touchState);
    };

    private readonly onPointerCancel = (event: PointerEvent) => {
        if (!this.hasActivePointer(event))
            return;
        const state = this.dragState!;
        this.completeInteraction(state, false);
    };

    private readonly onTouchCancel = (event: TouchEvent) => {
        const state = this.dragState;
        if (!state || state.kind !== 'touch')
            return;
        if (!this.findTrackedTouch(event, state.pointerId))
            return;
        this.completeInteraction(state, false);
    };

    private activateDrag(preventDefault?: () => void) {
        const state = this.dragState;
        if (!state || !this.element)
            return;
        if (state.kind === 'pointer' && !this.element.hasPointerCapture(state.pointerId))
            this.element.setPointerCapture(state.pointerId);
        state.isDragActive = true;
        this.options.setDragging(true);
        this.element.style.transition = '';
        this.element.style.userSelect = 'none';
        this.element.style.willChange = this.options.isBottom() ? 'transform' : 'transform, opacity';
        preventDefault?.();
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

    private finishInteraction(state: DragState) {
        if (state.kind === 'pointer' && this.element?.hasPointerCapture(state.pointerId))
            this.element.releasePointerCapture(state.pointerId);
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
        this.finishInteraction(state);
        if (shouldClose)
            this.options.onClose(state.delta, isBottom);
        else if (state.isDragActive)
            this.options.onSnapBack(state.delta, isBottom);
    }
}
