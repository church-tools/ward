import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChild, ElementRef, input, output, Signal, signal, TemplateRef, viewChildren, WritableSignal } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { AsyncValue } from '../../utils/async-value';
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

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('itemTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<any>>('insertTemplate');
    private readonly cardViews: Signal<readonly ElementRef<HTMLDivElement>[]> = viewChildren('card', { read: ElementRef });

    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly getId = multiComputed([this.idKey], idKey => idKey
        ? (item: T) => item[idKey]
        : (item: T) => item as any);
      // Events
    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();
    readonly addClick = output<void>();

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
                // if (newHeight) itemCard.height.set(newHeight);
            });
        });
    }

    async ngOnInit() {
        this.initialized.set(true);
    }
      protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }

    protected onAddClick(): void {
        this.addClick.emit();
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
        if (!newItemCards.length) return;
        const existingItemCards = this.itemCards();
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
}