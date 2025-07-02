import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, inject, input, output, Signal, signal, TemplateRef, viewChild, viewChildren, ViewContainerRef, WritableSignal } from '@angular/core';
import { MaybeAsync } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../icon/icon';
import { KeyWithValue } from '../../types';
import { AsyncValue } from '../../utils/async-value';
import { getChildInputElement } from '../../utils/dom-utils';
import { wait } from '../../utils/flow-control-utils';
import { xcomputed, xeffect } from '../../utils/signal-utils';
import WindowService from '../../window.service';
import { SwapContainerComponent } from '../swap-container/swap-container';

type ItemCard<T> = {
    item: T;
    height: WritableSignal<number | null>; // 0 means hidden, null means not yet initialized
    rect?: DOMRect; // used for animations
}

@Component({
    selector: 'app-card-list',
    imports: [NgTemplateOutlet, CdkDrag, CdkDropList, IconComponent, SwapContainerComponent],
    templateUrl: './card-list.html',
    styleUrl: './card-list.scss',
})
export class CardListComponent<T> {

    private readonly windowService = inject(WindowService);

    readonly items = input.required<T[]>();
    readonly editable = input(false);
    readonly gap = input(2);
    readonly idKey = input<keyof T | null>(null); // KeyWithValue<T, number | string> | null
    readonly orderByKey = input<KeyWithValue<T, number> | null | undefined>();
    readonly reorderable = input<boolean>(false);
    readonly getFilterText = input<(item: T) => string>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly itemInserted = input<(item: T) => MaybeAsync<void>>();

    readonly itemClick = output<T>();
    readonly selectionChange = output<T | null>();
    readonly orderChange = output<T[]>();
    readonly addClick = output<void>();

    protected readonly itemTemplate = contentChild.required<TemplateRef<{ $implicit: T }>>('itemTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<any>>('insertTemplate');
    private readonly cardViews = viewChildren('card', { read: ElementRef }) as Signal<readonly ElementRef<HTMLDivElement>[]>;
    private readonly insertionView = viewChild('insertion', { read: ElementRef });
    private readonly insertionCardView = viewChild('insertionCard', { read: ElementRef });
    
    protected readonly inserting = signal(false);
    protected readonly insertedItem = signal<T | null>(null);
    protected readonly newEditCard = signal(false);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly getId = xcomputed([this.idKey], idKey => idKey
        ? (item: T) => item[idKey]
        : (item: T) => item as any);

    private readonly listItemsByItem: Map<T, ItemCard<T>> = new Map();
    private readonly initialized = new AsyncValue<boolean>();
    private insertSubscriptions: Subscription[] = [];
    private dropped = false;
    private insertBtnHeight = 0;

    constructor() {
        xeffect([this.items], items => {
            this.updateItemCards(items);
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
        this.initialized.set(true);
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
        this.insertedItem.set(item);
        this.inserting.set(false);
        await wait(300);
        this.insertedItem.set(null);
        this.newEditCard.set(true);
        this.updateItemCards([...this.items(), item]);
        const element = this.insertionCardView()!.nativeElement;
        element.style.height = '0px';
        element.offsetHeight;
        element.style.height = `${this.insertBtnHeight}px`;
        element.style.transition = 'height 300ms ease';
        await wait(300);
        element.style.transition = '';
        element.style.height = 'auto';
        this.newEditCard.set(false);
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

    private updateItemCards(items: T[]) {
        const newItemCards: ItemCard<T>[] = items
            .filter(item => !this.listItemsByItem.has(item))
            .map(item => ({ item, height: signal(null) }));
        const existingItemCards = this.itemCards();
        if (newItemCards.length) {
            for (const itemCard of newItemCards)
                this.listItemsByItem.set(itemCard.item, itemCard);
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

    private animateCardViews(cardViews: readonly ElementRef<HTMLDivElement>[]) {
        const itemCards = this.itemCards();
        cardViews.forEach((cardView, index) => {
            const itemCard = itemCards[index];
            if (!itemCard) return;
            const oldRect = itemCard.rect;
            const newRect = itemCard.rect = cardView.nativeElement.getBoundingClientRect();
            if (!oldRect)
                return;
            if (Math.abs(oldRect.top - newRect.top) <= 1 || Math.abs(oldRect.left - newRect.left) <= 1)
                return;
            const deltaY = oldRect.top - newRect.top;
            const deltaX = oldRect.left - newRect.left;
            const element = cardView.nativeElement;
            
            // Apply the inverse transform immediately
            element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            element.style.transition = 'none';
            
            // Force a reflow
            element.offsetHeight;
            
            // Animate to the final position
            element.style.transition = 'transform 300ms ease';
            element.style.transform = 'translate(0px, 0px)';
            setTimeout(() => {
                element.style.transition = '';
                element.style.transform = '';
            }, 300);
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