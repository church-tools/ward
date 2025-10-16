import { CdkDrag, CdkDropList } from "@angular/cdk/drag-drop";
import { EventEmitter, Injectable, signal } from "@angular/core";

export type DragData<T> = { drag: CdkDrag, data: T, view: HTMLElement };
export type DropData<T> = { item: T, from: DropTarget, to: DropTarget, fromPosition: number, toPosition: number };
export type DropTarget = CdkDropList;

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    private readonly groups: Record<string, DragDropGroup> = {};

    getGroup<T>(identity: string): DragDropGroup<T> | undefined {
        return this.groups[identity];
    }

    ensureGroup<T>(identity: string) {
        return this.groups[identity] ??= new DragDropGroup<T>(identity);
    }
}

export class DragDropGroup<T = any> {

    private readonly _dragged = signal<DragData<T> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    private readonly targetSet = new Set<DropTarget>();
    private readonly _targets = signal<DropTarget[]>([]);
    public readonly targets = this._targets.asReadonly();
    public readonly dropped = new EventEmitter<DropData<T>>();

    constructor(public readonly identity: string) { }

    registerTargets(targets: readonly DropTarget[]) {
        for (const target of targets)
            this.targetSet.add(target);
        this._targets.set([...this.targetSet]);
    }

    unregisterTargets(targets: readonly DropTarget[]) {
        for (const target of targets)
            this.targetSet.delete(target);
        this._targets.set([...this.targetSet]);
    }

    setDrag(drag: CdkDrag, data: T, view: HTMLElement) {
        this._dragged.set({ drag, data, view });
    }

    clearDrag() {
        const dragged = this._dragged();
        if (!dragged) return;
        this._dragged.set(null);
    }
}