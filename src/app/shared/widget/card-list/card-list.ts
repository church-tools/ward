import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, input, output, Signal, signal, TemplateRef, viewChildren, WritableSignal } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { multiEffect } from '../../utils/signal-utils';

type ListItem<T> = {
    item: T;
    offset: WritableSignal<number>;
    height: number;
    visible: WritableSignal<boolean>;
}

@Component({
    selector: 'app-card-list',
    imports: [NgTemplateOutlet, IconComponent],
    templateUrl: './card-list.html',
    styleUrl: './card-list.scss',
})
export class CardListComponent<T> {

    readonly items = input.required<T[]>();
    readonly orderByKey = input<KeyWithValue<T, number>>();
    readonly reorderable = input<boolean>(false);
    readonly showFilter = input(false);
    readonly cardClasses = input<string>('card canvas-card');
    readonly cardPxGap = input<number>(8);

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ item: T }>>(TemplateRef);
    protected readonly cardViews: Signal<readonly ElementRef<HTMLDivElement>[]> = viewChildren('card', { read: ElementRef });
    
    private readonly selectedItem = signal<T | null>(null);
    protected readonly itemCards = signal<ListItem<T>[]>([]);
    protected readonly totalHeight = signal(0);
    
    // Events
    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();

    private readonly listItemsByItem: Map<T, ListItem<T>> = new Map();

    constructor() {
        multiEffect([this.items], items => {
            this.updateItemRendering(items);
        });
        multiEffect([this.cardViews], cards => {
            // await new Promise(resolve => requestAnimationFrame(resolve));
            const items = this.items();
            if (!cards || items.length != cards.length) return;
            let heightChanged = false;
            cards.forEach((card, index) => {
                const item = items[index];
                const listItem = this.listItemsByItem.get(item);
                if (!listItem) return;
                const newHeight = card.nativeElement.clientHeight;
                if (newHeight === listItem.height) return;
                listItem.height = newHeight;
                heightChanged = true;
            });
            if (heightChanged) {
                this.updateItemRendering(items);
            }
        });
    }
    
    protected onItemClick(listItem: ListItem<T>): void {
        this.itemClick.emit(listItem.item);
    }

    private updateItemRendering(items: T[]) {
        const itemCards = items.map(item => this.listItemsByItem.get(item));
        const newItemCards = items.filter((_, i) => !itemCards[i]).map(item =>
            <ListItem<T>>{ item, height: 0, offset: signal(0), visible: signal(false) });
        if (newItemCards.length) {
            const existingItemCards = this.itemCards();
            for (const itemCard of newItemCards)
                this.listItemsByItem.set(itemCard.item, itemCard);
            this.itemCards.set([...existingItemCards, ...newItemCards]);
            return;
        }
        const safeItemCards = itemCards as ListItem<T>[];
        const orderbyKey = this.orderByKey();
        if (orderbyKey)
            safeItemCards.sort((a, b) => (<number>a.item[orderbyKey]) - (<number>b.item[orderbyKey]));
        let offset = 0;
        const gap = this.cardPxGap();
        for (const itemCard of safeItemCards) {
            // if (!itemCard.visible()) continue;
            itemCard.offset.set(offset);
            itemCard.visible.set(true);
            offset += itemCard.height + gap;
        }
        this.totalHeight.set(offset);
    }
}