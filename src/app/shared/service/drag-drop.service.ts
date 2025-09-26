import { CdkDrag, CdkDropList } from "@angular/cdk/drag-drop";
import { Injectable, signal } from "@angular/core";

export type DragData<T> = { drag: CdkDrag, data: T, view: HTMLElement };
export type DropTarget = CdkDropList;

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    private readonly groups: Record<string, DragDropGroup> = {};

    getGroup(identity: string): DragDropGroup | undefined {
        return this.groups[identity];
    }

    ensureGroup(identity: string) {
        return this.groups[identity] ??= new DragDropGroup(identity);
    }
}

export class DragDropGroup {

    private readonly _dragged = signal<DragData<any> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    private readonly targetSet = new Set<DropTarget>();
    private readonly _targets = signal<DropTarget[]>([]);
    public readonly targets = this._targets.asReadonly();

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

    setDrag<T>(drag: CdkDrag, data: T, view: HTMLElement) {
        this._dragged.set({ drag, data, view });
    }

    clearDrag() {
        const dragged = this._dragged();
        if (!dragged) return;
        this._dragged.set(null);
    }
}