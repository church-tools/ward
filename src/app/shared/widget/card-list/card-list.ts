import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, input, output, Signal, signal, TemplateRef, viewChild, viewChildren, WritableSignal } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { AsyncValue } from '../../utils/async-value';
import { getChildInputElement } from '../../utils/dom-utils';
import { multiComputed, multiEffect } from '../../utils/signal-utils';

type ItemCard<T> = {
    item: T;
    height: WritableSignal<number | null>; // 0 means hidden, null means not yet initialized
}

@Component({
    selector: 'app-card-list',
    imports: [NgTemplateOutlet, CdkDrag, CdkDropList, IconComponent],
    templateUrl: './card-list.html',
    styleUrl: './card-list.scss',
})
export class CardListComponent<T> {

    readonly items = input.required<T[]>();
    readonly editable = input(false);
    readonly idKey = input<keyof T | null>(null); // KeyWithValue<T, number | string> | null
    readonly orderByKey = input<KeyWithValue<T, number> | null | undefined>();
    readonly reorderable = input<boolean>(false);
    readonly getFilterText = input<(item: T) => string>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');

    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();
    readonly addClick = output<void>();

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('itemTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<any>>('insertTemplate');
    private readonly cardViews = viewChildren('card', { read: ElementRef }) as Signal<readonly ElementRef<HTMLDivElement>[]>;
    private readonly insertionView = viewChild('insertion', { read: ElementRef });
    
    protected readonly inserting = signal(false);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly getId = multiComputed([this.idKey], idKey => idKey
        ? (item: T) => item[idKey]
        : (item: T) => item as any);

    private readonly listItemsByItem: Map<T, ItemCard<T>> = new Map();
    private readonly initialized = new AsyncValue<boolean>();

    constructor() {
        multiEffect([this.items], items => {
            this.updateItemCards(items);
        });
        multiEffect([this.cardViews], cardViews => {
            if (!cardViews) return;
            const itemCards = this.itemCards();
            cardViews.forEach((card, index) => {
                const itemCard = itemCards[index];
                if (!itemCard) return;
                // const newHeight = card.nativeElement.clientHeight;
                // if (newHeight) itemCard.heighasdt.set(newHeight);
            });
        });
        multiEffect([this.insertionView], insertionView => {
            getChildInputElement(insertionView?.nativeElement)?.focus();
        });
    }

    async ngOnInit() {
        this.initialized.set(true);
    }
      protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }

    protected onInsertClick(): void {
        if (this.insertTemplate()) {
            this.inserting.set(true);
        } else {
            this.addClick.emit();
        }
    }
    
    protected onDrop(event: CdkDragDrop<string[]>) {
        if (event.currentIndex === event.previousIndex) return;
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
    }

    private updateItemCards(items: T[]) {
        const newItemCards: ItemCard<T>[] = items
            .filter(item => !this.listItemsByItem.has(item))
            .map(item => ({ item, height: signal(null) }));
        const existingItemCards = this.itemCards();
        if (!newItemCards.length) {
            if (!this.correctOrder(existingItemCards)) {
                this.sort(existingItemCards);
                this.itemCards.set(existingItemCards);
            }
            return;
        }
        for (const itemCard of newItemCards)
            this.listItemsByItem.set(itemCard.item, itemCard);
        const allItemCards = [...existingItemCards, ...newItemCards];
        this.sort(allItemCards)
        this.itemCards.set(allItemCards);
    }

    private sort(itemCards: ItemCard<T>[]) {
        const orderbyKey = this.orderByKey();
        if (!orderbyKey) return;
        itemCards.sort((a, b) => (<number>a.item[orderbyKey]) - (<number>b.item[orderbyKey]));
    }

    private correctOrder(itemCards: ItemCard<T>[]) {
        const orderByKey = this.orderByKey();
        if (!orderByKey) return true;
        for (let i = 0; i < itemCards.length; i++)
            if (itemCards[i].item[orderByKey] > itemCards[i + 1]?.item[orderByKey])
                return false;
        return true;
    }
}