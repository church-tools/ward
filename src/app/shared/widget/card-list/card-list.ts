import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, inject, input, model, output, Signal, signal, TemplateRef, viewChild, viewChildren } from '@angular/core';
import { MaybeAsync, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { getChildInputElement, transitionStyle } from '../../utils/dom-utils';
import { Lock, Mutex, wait } from '../../utils/flow-control-utils';
import { hasRecords } from '../../utils/record-utils';
import { xeffect } from '../../utils/signal-utils';
import WindowService from '../../window.service';
import { SwapContainerComponent } from '../swap-container/swap-container';

type ItemCard<T> = {
    id: number;
    item: T;
    entranceAnimation?: boolean;
    rect?: DOMRect; // used for animations
}

@Component({
    selector: 'app-card-list',
    imports: [RouterModule, NgTemplateOutlet, CdkDrag, CdkDropList, IconComponent, SwapContainerComponent],
    templateUrl: './card-list.html',
    styleUrl: './card-list.scss',
})
export class CardListComponent<T> {

    private readonly windowService = inject(WindowService);

    readonly itemsById = model.required<Record<number, T>>();
    readonly editable = input(false);
    readonly gap = input(2);
    readonly idKey = input.required<KeyWithValue<T, number>>();
    readonly orderByKey = input<KeyWithValue<T, number> | null | undefined>();
    readonly reorderable = input<boolean>(false);
    readonly getFilterText = input<(item: T) => string>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly itemInserted = input<(item: T) => MaybeAsync<void>>();
    readonly getUrl = input<(item: T) => string>();
    readonly insertRow = input<(item: T) => Promise<T>>();

    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();
    readonly addClick = output<void>();

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('itemTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<any>>('insertTemplate');
    private readonly cardViews = viewChildren('card', { read: ElementRef }) as Signal<readonly ElementRef<HTMLElement>[]>;
    private readonly insertionView = viewChild('insertion', { read: ElementRef });
    private readonly insertionCardView = viewChild('insertionCard', { read: ElementRef });
    
    protected readonly inserting = signal(false);
    protected readonly insertedItem = signal<T | null>(null);
    protected readonly newEditCard = signal(false);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);

    private readonly listItemsById: Record<number, ItemCard<T>> = {};
    private readonly changeLock = new Lock();
    private readonly dragDropMutex = new Mutex();
    
    private initialized = false;
    private insertSubscriptions: Subscription[] = [];
    private dropped = false;
    private insertBtnHeight = 0;

    constructor() {
        xeffect([this.itemsById], async itemsById => {
            await this.changeLock.lock();
            await this.dragDropMutex.wait();
            this.updateItemCards(itemsById);
        });
        xeffect([this.cardViews], cardViews => {
            if (this.dropped) {
                this.dropped = false;
                return;
            }
            this.animateCardViews(cardViews);
        });
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
                this.windowService.onKeyPressed('Enter').subscribe(async () => {
                    this.itemInserted();
                }),
            ];
        });
    }

    async ngOnInit() {
        await wait(1000);
        this.initialized = true;
    }

    protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }

    protected onInsertClick(): void {
        const element = this.insertionCardView()!.nativeElement;
        this.insertBtnHeight = element.getBoundingClientRect().height;
        if (this.insertTemplate()) {
            this.inserting.set(true);
        } else {
            this.addClick.emit();
        }
    }

    protected insert = async (item: T) => {
        this.changeLock.lock(async () => {
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
            const id = insertedItem[this.idKey()] as number;
            this.itemsById.update(itemsById => {
                itemsById[id] = insertedItem;
                this.updateItemCards(itemsById, false);
                return itemsById;
            });
            const element = this.insertionCardView()!.nativeElement;
            await transitionStyle(element, { height: '0'}, { height: `${this.insertBtnHeight}px` }, 300, 'ease-out', true);
            this.newEditCard.set(false);
        });
    }

    protected cancelInsert = () => {
        this.inserting.set(false);
    }

    protected onDragStart(itemCard: ItemCard<T>) {
        this.dragDropMutex.acquire();
    }

    protected onDragEnd(itemCard: ItemCard<T>) {
        this.dragDropMutex.release();
    }
    
    protected onDrop(event: CdkDragDrop<string[]>) {
        if (event.currentIndex === event.previousIndex)
            return;
        const itemCards = this.itemCards();
        moveItemInArray(itemCards, event.previousIndex, event.currentIndex);
        const orderByKey = this.orderByKey();
        if (!orderByKey) return;
        const itemCard = itemCards[event.currentIndex];
        const leadingPosition = <number | null>itemCards[event.currentIndex - 1]?.item[orderByKey];
        const followingPosition = <number | null>itemCards[event.currentIndex + 1]?.item[orderByKey];
        const position = (leadingPosition != null && followingPosition != null)
            ? (leadingPosition + followingPosition) / 2
            : (leadingPosition != null
                ? leadingPosition + 1
                : followingPosition != null ? followingPosition - 1 : 0);
        itemCard.item[orderByKey] = <any>position;
        this.orderChange.emit([itemCard.item]);
        this.dropped = true;
    }

    private updateItemCards(itemsById: Record<number, T>, entranceAnimation = true) {
        const newItemCards = Object.entries(itemsById)
            .filter(([id, _]) => !(id in this.listItemsById))
            .map(([id, item]) => <ItemCard<T>>{ id: +id, item, entranceAnimation: entranceAnimation && this.initialized });
        const existingItemCards = this.itemCards();
        if (newItemCards.length) {
            this.initialized = true;
            for (const itemCard of newItemCards)
                this.listItemsById[itemCard.id] = itemCard;
            this.setItemCards([...existingItemCards, ...newItemCards]);
        } else {
            this.setItemCards(existingItemCards);
        }
    }

    private async setItemCards(newItemCards: ItemCard<T>[]) {
        if (!this.orderIsCorrect(newItemCards))
            this.sort(newItemCards);
        this.itemCards.set(newItemCards);
    }

    private animateCardViews(cardViews: readonly ElementRef<HTMLElement>[]) {
        const itemCards = this.itemCards();
        cardViews.forEach((cardView, index) => {
            const itemCard = itemCards[index];
            if (!itemCard) return;
            const element = cardView.nativeElement;
            const newRect = itemCard.rect = element.getBoundingClientRect();
            const fromStyle: Partial<CSSStyleDeclaration> = {};
            const toStyle: Partial<CSSStyleDeclaration> = {};
            if (itemCard.entranceAnimation) {
                itemCard.entranceAnimation = false;
                fromStyle.height = '0px';
                fromStyle.opacity = '0';
                toStyle.height = `${newRect.height}px`;
                toStyle.opacity = '1';
            }
            const oldRect = itemCard.rect;
            if (oldRect && (Math.abs(oldRect.top - newRect.top) > 1 || Math.abs(oldRect.left - newRect.left) > 1)) {
                fromStyle.transform = `translate(${oldRect.left - newRect.left}px, ${oldRect.top - newRect.top}px)`;
                toStyle.transform = 'translate(0px, 0px)';
            }
            if (hasRecords(fromStyle))
                transitionStyle(element, fromStyle, toStyle, 300, 'ease-out', true);
        });
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