import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, input, output, Signal, signal, TemplateRef, viewChildren, WritableSignal } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { AsyncValue } from '../../utils/async-value';
import { multiEffect } from '../../utils/signal-utils';

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
    readonly orderByKey = input<KeyWithValue<T, number>>();
    readonly reorderable = input<boolean>(false);
    readonly showFilter = input(false);
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ item: T }>>(TemplateRef);
    private readonly cardViews: Signal<readonly ElementRef<HTMLDivElement>[]> = viewChildren('card', { read: ElementRef });
    
    private readonly selectedItem = signal<T | null>(null);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    
    // Events
    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();

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
                const newHeight = card.nativeElement.clientHeight;
                if (newHeight) itemCard.height.set(newHeight);
            });
        });
    }

    async ngOnInit() {
        this.initialized.set(true);
    }
    
    protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }
    
    protected onDrop(event: CdkDragDrop<string[]>) {
        const itemCards = this.itemCards();
        moveItemInArray(itemCards, event.previousIndex, event.currentIndex);
        this.itemCards.set(itemCards);
        const orderByKey = this.orderByKey()!;
        const changed = itemCards.filter((itemCard, i) => {
            if (itemCard.item[orderByKey] === i) return false;
            itemCard.item[orderByKey] = <any>i;
            return true;
        });
        if (changed.length)
            this.orderChange.emit(changed.map(itemCard => itemCard.item));
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
        return itemCards.sort((a, b) => (<number>a.item[orderbyKey]) - (<number>b.item[orderbyKey]));
    }
}