import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, input, output, Signal, signal, TemplateRef, viewChildren, WritableSignal } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { AsyncValue } from '../../utils/async-value';
import { multiEffect } from '../../utils/signal-utils';

type ItemCard<T> = {
    item: T;
    offset: WritableSignal<number>;
    height: number;
    visible: WritableSignal<boolean>;
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
    readonly cardPxGap = input<number>(8);

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ item: T }>>(TemplateRef);
    private readonly cardViews: Signal<readonly ElementRef<HTMLDivElement>[]> = viewChildren('card', { read: ElementRef });
    
    private readonly selectedItem = signal<T | null>(null);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly totalHeight = signal(0);
    
    // Events
    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();

    private readonly listItemsByItem: Map<T, ItemCard<T>> = new Map();
    private readonly initialized = new AsyncValue<boolean>();

    constructor() {
        multiEffect([this.items], items => {
            this.updateItemCards(items);
        });
        multiEffect([this.cardViews], cards => {
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
                this.updateItemCardRendering();
            }
        });
    }

    async ngOnInit() {
        this.initialized.set(true);
    }
    
    protected onItemClick(listItem: ItemCard<T>): void {
        this.itemClick.emit(listItem.item);
    }
    
    protected onDrop(event: CdkDragDrop<string[]>) {
        
    }

    private updateItemCards(items: T[]) {
        const newItemCards = items.filter(item => !this.listItemsByItem.has(item)).map(item =>
            <ItemCard<T>>{ item, height: 0, offset: signal(0), visible: signal(false) });
        if (!newItemCards.length) return;
        const existingItemCards = this.itemCards();
        for (const itemCard of newItemCards)
            this.listItemsByItem.set(itemCard.item, itemCard);
        this.itemCards.set([...existingItemCards, ...newItemCards]);
    }

    private updateItemCardRendering() {
        const safeItemCards = this.itemCards() as ItemCard<T>[];
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