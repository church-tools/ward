import { Directive, ElementRef, inject, input, OnDestroy, OnInit, output } from '@angular/core';

@Directive({
  selector: '[watchChildren]'
})
export class WatchChildrenDirective implements OnInit, OnDestroy {
    
    private readonly el = inject(ElementRef<HTMLElement>);

    private observer!: MutationObserver;

    readonly watchChildClass = input.required<string>();
    readonly childAdded = output<HTMLElement>();
    readonly childRemoved = output<HTMLElement>();


    ngOnInit() {
        this.observer = new MutationObserver(mutations => {
            mutations.filter(m => m.type === 'childList').forEach(({ addedNodes, removedNodes }) => {
                addedNodes
                .filter(this.fitsCriteria.bind(this))
                .forEach(node => this.childAdded.emit(node));
                removedNodes
                .filter(this.fitsCriteria.bind(this))
                .forEach(node => this.childRemoved.emit(node));
            });
        });
        this.observer.observe(this.el.nativeElement, { childList: true, subtree: false });
    }

    ngOnDestroy() {
        this.observer.disconnect();
    }

    private fitsCriteria(node: Node): node is HTMLElement {
        return node instanceof HTMLElement && node.classList.contains(this.watchChildClass());
    }
}

declare global {
    interface NodeList {
        filter<T extends Node>(predicate: (value: Node, index: number, array: Node[]) => value is T, thisArg?: any): T[];
        filter(predicate: (value: Node, index: number, array: Node[]) => boolean, thisArg?: any): Node[];
    }
}

if (!NodeList.prototype.filter) {
    NodeList.prototype.filter = function<T extends Node>(
        predicate: (value: Node, index: number, array: Node[]) => boolean,
        thisArg?: any
    ): T[] | Node[] {
        return Array.prototype.filter.call(this, predicate, thisArg);
    };
}

export { };

