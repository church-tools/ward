import { CdkDrag, CdkDragDrop, CdkDragStart, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, inject, Injector, input, output, Signal, signal, TemplateRef, viewChild, viewChildren, WritableSignal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Icon, IconComponent } from '../../icon/icon';
import { DragDropService, DropData } from '../../service/drag-drop.service';
import { WindowService } from '../../service/window.service';
import { PromiseOrValue } from '../../types';
import { getChildInputElement, transitionStyle } from '../../utils/dom-utils';
import { Lock, Mutex, wait } from '../../utils/flow-control-utils';
import { waitForNextChange, xcomputed, xeffect } from '../../utils/signal-utils';
import { animationDurationMs, easeOut } from '../../utils/style';
import { WatchChildrenDirective } from "../../utils/watch-children";
import { SwapContainerComponent } from '../swap-container/swap-container';

type ItemCard<T> = {
    id: number;
    item: T;
    top?: number; // used for animations - relative to container
    animateEntrance: boolean;
    removed: WritableSignal<boolean>;
}

@Component({
    selector: 'app-card-list',
    imports: [RouterModule, NgTemplateOutlet, CdkDrag, CdkDropList, IconComponent, SwapContainerComponent, WatchChildrenDirective],
    templateUrl: './card-list.html',
    styleUrl: './card-list.scss',
})
export class CardListComponent<T> {

    private readonly injector = inject(Injector);
    private readonly windowService = inject(WindowService);
    private readonly dragDrop = inject(DragDropService);
    private readonly element = inject(ElementRef) as ElementRef<HTMLElement>;

    readonly editable = input(false);
    readonly gap = input(2);
    readonly idKey = input.required<keyof T>();
    readonly orderByKey = input<keyof T | null | undefined>();
    readonly reorderable = input<boolean>(false);
    readonly getFilterText = input<(item: T) => string>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly itemInserted = input<(item: T) => PromiseOrValue<void>>();
    readonly getUrl = input<(item: T) => string>();
    readonly insertRow = input<(item: T) => Promise<T>>();
    readonly activeId = input<number | null>(null);
    readonly dragDropGroup = input<string | null>(null);
    readonly emptyIcon = input<Icon | null>(null);

    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();
    readonly itemDropped = output<T>();
    readonly addClick = output<void>();

    protected readonly dropList = viewChild.required(CdkDropList);
    protected readonly itemTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('itemTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<any>>('insertTemplate');
    private readonly cardViews = viewChildren('card', { read: ElementRef }) as Signal<readonly ElementRef<HTMLElement>[]>;
    private readonly insertionView = viewChild('insertion', { read: ElementRef });
    private readonly insertionCardView = viewChild('insertionCard', { read: ElementRef });
    
    protected readonly inserting = signal(false);
    readonly isInserting = this.inserting.asReadonly();
    protected readonly insertedItem = signal<T | null>(null);
    protected readonly newEditCard = signal(false);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly dragStartDelay = { touch: this.windowService.mobileOS ? 500 : 300, mouse: 0 };
    private readonly _initialized = signal(false);
    public readonly initialized = this._initialized.asReadonly();

    protected readonly _dragDropGroup = xcomputed([this.dragDropGroup],
        group => group ? this.dragDrop.ensureGroup<T>(group) : undefined);
    protected readonly targetDropLists = xcomputed([this._dragDropGroup],
        group => group?.targets() ?? []);
    readonly cardCount = xcomputed([this.itemCards], cards => cards.length);

    private readonly changeLock = new Lock();
    private readonly dragDropMutex = new Mutex();
    

    private insertSubscriptions: Subscription[] = [];
    private dropSubscription: Subscription | undefined;
    private dragStart: number | null = null;
    private insertBtnHeight = 0;

    constructor() {
        xeffect([this.insertionView, this.inserting], async (insertionView, inserting) => {
            if (!inserting || !insertionView) {
                this.insertSubscriptions.forEach(sub => sub.unsubscribe());
                this.insertSubscriptions = [];
                return;
            }
            await wait(100);
            getChildInputElement(insertionView.nativeElement)?.focus();
            this.insertSubscriptions.forEach(sub => sub.unsubscribe());
            this.insertSubscriptions = [
                this.windowService.onKeyPressed('Escape').subscribe(() => this.inserting.set(false)),
                this.windowService.onKeyPressed('Enter').subscribe(() => this.itemInserted()),
            ];
        });
        xeffect([this._dragDropGroup, this.dropList], (group, dropList) => {
            if (dropList) group?.registerTargets([dropList]);
            this.dropSubscription?.unsubscribe();
            this.dropSubscription = group?.dropped.subscribe(this.onDrop.bind(this));
        });
    }

    async ngOnInit() {
        await wait(1000);
        this._initialized.set(true);
    }

    ngOnDestroy() {
        this.dropSubscription?.unsubscribe();
        const dropList = this.dropList();
        if (dropList) this._dragDropGroup()?.unregisterTargets([dropList]);
    }

    async updateItems(update: { items?: T[], deletions?: number[] }) {
        await this.changeLock.lock();
        await this.dragDropMutex.wait();
        await this.updateItemCards(update);
    }

    async scrollToItem(id: number) {
        const itemCards = this.itemCards();
        const index = itemCards.findIndex(card => card.id === id);
        if (index === -1) return;
        const cardViews = this.cardViews();
        const cardView = cardViews[index];
        cardView.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    getLast(): T | null {
        const itemCards = this.itemCards();
        if (!itemCards.length) return null;
        return itemCards[itemCards.length - 1].item;
    }

    protected placeholderAdded(item: HTMLElement) {
        if (this.dragStart && this.dragStart + 100 > Date.now()) return;
        const height = item.getBoundingClientRect().height;
        transitionStyle(item, { height: '0' }, { height: `${height}px` }, animationDurationMs, easeOut, true);
    }

    protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }

    protected onInsertClick(): void {
        const element = this.insertionCardView()!.nativeElement as HTMLElement;
        this.insertBtnHeight = element.getBoundingClientRect().height;
        if (this.insertTemplate()) {
            this.inserting.set(true);
        } else {
            this.addClick.emit();
        }
    }

    protected insert = async (item: T) => {
        await this.changeLock.lock(async () => {
            this.insertedItem.set(item);
            this.inserting.set(false);
            const onInsert = this.insertRow();
            if (!onInsert) throw new Error('onInsert function is not provided');
            const [insertedItem] = await Promise.all([
                onInsert(item),
                wait(300)
            ]);
            if (!insertedItem) throw new Error('Insertion interruped');
            this.insertedItem.set(null);
            this.newEditCard.set(true);
            this.updateItemCards({ items: [insertedItem] }, false);
            const element = this.insertionCardView()!.nativeElement as HTMLElement;
            await transitionStyle(element, { height: '0' },
                { height: `${this.insertBtnHeight}px` }, 300, easeOut, true);
            this.newEditCard.set(false);
        });
    }

    protected cancelInsert = () => {
        this.inserting.set(false);
    }

    protected onDragStart(event: CdkDragStart, itemCard: ItemCard<T>, card: HTMLElement) {
        this.dragStart = Date.now();
        this.dragDropMutex.acquire();
        this._dragDropGroup()?.setDrag(event.source, itemCard.item, card);
    }

    protected onDragEnd(itemCard: ItemCard<T>) {
        setTimeout(() => {
            this.dragDropMutex.release();
            this._dragDropGroup()?.clearDrag();
        }, 0);
    }
    
    protected onDropHere(event: CdkDragDrop<string[]>) {
        const dragData = this._dragDropGroup()?.dragged();
        if (dragData?.dropHandled) return;
        const item = dragData?.data as T | null;
        if (!item) return;
        this._dragDropGroup()?.dropped.emit({ item,
            from: event.previousContainer, to: event.container,
            fromPosition: event.previousIndex, toPosition: event.currentIndex });
    }

    protected onDrop(data: DropData<T>) {
        const fromHere = data.from === this.dropList();
        data.to === this.dropList()
            ? fromHere
                ? this.moveDroppedItem(data)
                : this.addDroppedItem(data)
            : fromHere
                ? this.removeDroppedItem(data)
                : null;
    }

    private moveDroppedItem(data: DropData<T>) {
        if (data.fromPosition === data.toPosition) return;
        const itemCards = this.itemCards();
        moveItemInArray(itemCards, data.fromPosition, data.toPosition);
        const orderByKey = this.orderByKey();
        if (!orderByKey) return;
        const itemCard = itemCards.find(c => c.item === data.item);
        if (!itemCard) return;
        itemCard.item[orderByKey] = this.getPositionForIndex(itemCards, data.toPosition);
        const changed = [itemCard.item];
        this.orderChange.emit(changed);
    }

    private addDroppedItem(data: DropData<T>) {
        const itemCards = this.itemCards();
        const idKey = this.idKey();
        const id = data.item[idKey] as number;
        if (itemCards.some(card => card.id === id)) return;
        const newItemCards = [...itemCards];
        newItemCards.splice(data.toPosition, 0, { id, item: data.item, animateEntrance: false, removed: signal(false) });
        const orderByKey = this.orderByKey();
        if (orderByKey)
            data.item[orderByKey] = this.getPositionForIndex(newItemCards, data.toPosition);
        this.itemCards.set(newItemCards);
        this.itemDropped.emit(data.item);
    }

    private removeDroppedItem(data: DropData<T>) {
        const newItemCards = [...this.itemCards()];
        newItemCards.splice(data.fromPosition, 1);
        this.itemCards.set(newItemCards);
    }

    private getPositionForIndex(itemCards: ItemCard<T>[], index: number): any {
        const orderByKey = this.orderByKey();
        if (!orderByKey) throw new Error('OrderByKey is not set');
        const leadingPosition = <number | null>itemCards[index - 1]?.item[orderByKey];
        const followingPosition = <number | null>itemCards[index + 1]?.item[orderByKey];
        return (leadingPosition != null && followingPosition != null)
            ? (leadingPosition + followingPosition) / 2
            : (leadingPosition != null
                ? leadingPosition + 1
                : followingPosition != null ? followingPosition - 1 : 0);
    }

    private async updateItemCards(update: { items?: T[], deletions?: number[] }, animateEntrance = true) {
        const { items = [], deletions = [] } = update;
        if (!items.length && !deletions.length) {
            this._initialized.set(true);
            return;
        }
        let itemCards = [...this.itemCards()];
        animateEntrance &&= this._initialized();
        const idKey = this.idKey();
        const itemCardMap = new Map<number, ItemCard<T>>(itemCards.map(itemCard => [itemCard.id, itemCard]));
        for (const item of items) {
            const id = item[idKey] as number;
            const itemCard = itemCardMap.get(id);
            if (itemCard) {
                itemCard.item = item;
            } else if (item) {
                itemCards.push({ id, item, animateEntrance, removed: signal(false) });
            }
        }
        if (deletions.length) {
            itemCards = itemCards.filter(card => {
                if (!deletions.includes(card.id)) return true;
                card.removed.set(true);
                return false;
            });
            await wait(animationDurationMs);
        }
        this._initialized.set(true);
        this.itemCards.set(itemCards);
        if (this.orderIsCorrect(itemCards)) return;
        this.sort(itemCards);
        const cardViews = await waitForNextChange(this.cardViews, this.injector);
        const containerRect = this.element.nativeElement.getBoundingClientRect();
        for (let i = 0; i < cardViews.length; i++) {
            const itemCard = itemCards[i];
            if (!itemCard) return;
            const cardView = cardViews[i];
            const element = cardView.nativeElement;
            const oldTop = itemCard.top;
            const absoluteRect = element.getBoundingClientRect();
            const newTop = itemCard.top = absoluteRect.top - containerRect.top;
            if (oldTop === undefined || Math.abs(oldTop - newTop) < 1) continue;
            transitionStyle(element,
                { transform: `translate(0px, ${oldTop - newTop}px)` },
                { transform: 'translate(0px, 0px)' }, 300, easeOut, true);
        }
    }

    private sort(itemCards: ItemCard<T>[]) {
        const orderByKey = this.orderByKey();
        if (!orderByKey || itemCards.length <= 1) return;
        itemCards.sort((a, b) => (a.item[orderByKey] as number) - (b.item[orderByKey] as number));
    }

    private orderIsCorrect(itemCards: ItemCard<T>[]) {
        const orderByKey = this.orderByKey();
        if (!orderByKey) return true;
        for (let i = 0; i < itemCards.length; i++)
            if (itemCards[i].item[orderByKey] > itemCards[i + 1]?.item[orderByKey])
                return false;
        return true;
    }

}
