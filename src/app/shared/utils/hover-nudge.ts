type Point = { x: number, y: number };

type HoverNudgeOptions = {
    className?: string;
    distance?: number;
    durationMs?: number;
    minSpeed?: number;
    maxSpeed?: number;
};

const DEFAULT_OPTIONS: Required<HoverNudgeOptions> = {
    className: 'hover-enter-bounce',
    distance: 2,
    durationMs: 260,
    minSpeed: 0.5,
    maxSpeed: 8,
};

class HoverNudge {

    private currentMousePosition: Point | null = null;
    private previousMousePosition: Point | null = null;
    private readonly timeouts = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

    constructor(document: Document) {
        document.defaultView?.addEventListener('mousemove', event => {
            this.previousMousePosition = this.currentMousePosition;
            this.currentMousePosition = { x: event.clientX, y: event.clientY };
        }, { passive: true });
    }

    nudgeOnMouseEnter(event: MouseEvent, target: HTMLElement, options?: HoverNudgeOptions) {
        const settings = { ...DEFAULT_OPTIONS, ...options };
        const movement = this.getMovement(event, target);
        if (!movement) return;

        const distanceScale = this.getSpeedScale(movement.speed, settings.minSpeed, settings.maxSpeed);
        if (distanceScale <= 0) return;

        const [nx, ny] = movement.direction;
        const distance = settings.distance * distanceScale;

        target.style.setProperty('--hover-enter-x', `${(nx * distance).toFixed(2)}px`);
        target.style.setProperty('--hover-enter-y', `${(ny * distance).toFixed(2)}px`);

        clearTimeout(this.timeouts.get(target));
        this.timeouts.delete(target);

        target.classList.remove(settings.className);
        void target.offsetWidth;
        target.classList.add(settings.className);

        this.timeouts.set(target, setTimeout(() => {
            target.classList.remove(settings.className);
            this.timeouts.delete(target);
        }, settings.durationMs));
    }

    private getMovement(event: MouseEvent, target: HTMLElement) {
        const tracked = this.previousMousePosition && this.currentMousePosition
            ? this.directionWithSpeed(
                this.currentMousePosition.x - this.previousMousePosition.x,
                this.currentMousePosition.y - this.previousMousePosition.y)
            : null;
        if (tracked) return tracked;

        const native = this.directionWithSpeed(event.movementX ?? 0, event.movementY ?? 0);
        if (native) return native;

        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const direction = this.normalizedDirection(
            event.clientX - (rect.left + rect.width / 2),
            event.clientY - (rect.top + rect.height / 2));
        return direction ? { direction, speed: 0 } : null;
    }

    private directionWithSpeed(x: number, y: number) {
        const speed = Math.hypot(x, y);
        if (!speed) return null;
        return {
            direction: [x / speed, y / speed] as [number, number],
            speed,
        };
    }

    private getSpeedScale(speed: number, minSpeed: number, maxSpeed: number) {
        if (speed <= minSpeed) return 0;
        if (maxSpeed <= minSpeed) return 1;
        if (speed >= maxSpeed) return 1;
        return (speed - minSpeed) / (maxSpeed - minSpeed);
    }

    private normalizedDirection(x: number, y: number): [number, number] | null {
        const length = Math.hypot(x, y);
        if (!length) return null;
        return [x / length, y / length];
    }

}

const hoverNudges = new WeakMap<Document, HoverNudge>();

export function getHoverNudge(document: Document) {
    let nudge = hoverNudges.get(document);
    if (!nudge) {
        nudge = new HoverNudge(document);
        hoverNudges.set(document, nudge);
    }
    return nudge;
}
