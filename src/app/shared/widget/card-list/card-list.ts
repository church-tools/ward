import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, ElementRef, inject, input, output, Signal, signal, TemplateRef, viewChild, viewChildren, WritableSignal } from '@angular/core';
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
    
    protected readonly inserting = signal(false);
    protected readonly insertedItem = signal<T | null>(null);
    protected readonly itemCards = signal<ItemCard<T>[]>([]);
    protected readonly getId = xcomputed([this.idKey], idKey => idKey
        ? (item: T) => item[idKey]
        : (item: T) => item as any);

    private readonly listItemsByItem: Map<T, ItemCard<T>> = new Map();
    private readonly initialized = new AsyncValue<boolean>();
    private insertSubscriptions: Subscription[] = [];

    constructor() {
        xeffect([this.items], items => {
            this.updateItemCards(items);
        });
        xeffect([this.cardViews], cardViews => {
            if (!cardViews) return;
            const itemCards = this.itemCards();
            cardViews.forEach((card, index) => {
                const itemCard = itemCards[index];
                if (!itemCard) return;
                // const newHeight = card.nativeElement.clientHeight;
                // if (newHeight) itemCard.heighasdt.set(newHeight);
            });
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
        if (this.insertTemplate()) {
            this.inserting.set(true);
        } else {
            this.addClick.emit();
        }
    }

    protected insert = (item: T) => {
        this.insertedItem.set(item);
        this.inserting.set(false);
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

    private async updateItemCards(items: T[]) {
        const newItemCards: ItemCard<T>[] = items
            .filter(item => !this.listItemsByItem.has(item))
            .map(item => ({ item, height: signal(null) }));
        const existingItemCards = this.itemCards();
        
        if (!newItemCards.length) {
            if (!this.correctOrder(existingItemCards)) {
                // await this.animateProgrammaticReorder(existingItemCards);
                this.sort(existingItemCards);
                this.itemCards.set(existingItemCards);
            }
            return;
        }
        
        for (const itemCard of newItemCards)
            this.listItemsByItem.set(itemCard.item, itemCard);
        const allItemCards = [...existingItemCards, ...newItemCards];
        
        if (!this.correctOrder(allItemCards)) {
            // await this.animateProgrammaticReorder(allItemCards);
            this.sort(allItemCards);
        }
        
        this.itemCards.set(allItemCards);
    }

    private sort(itemCards: ItemCard<T>[]) {
        const orderByKey = this.orderByKey();
        if (!orderByKey || itemCards.length <= 1) return [];
        const getId = this.getId();
        const originalPositions = new Map(itemCards.map((card, i) => [getId(card.item), i]));
        itemCards.sort((a, b) => (a.item[orderByKey] as number) - (b.item[orderByKey] as number));
        return itemCards
            .map((card, newIndex) => ({ card, newIndex, originalIndex: originalPositions.get(getId(card.item)) }))
            .filter(({ originalIndex, newIndex }) => originalIndex !== undefined && originalIndex !== newIndex)
            .map(({ card, originalIndex, newIndex }) => ({
                itemCard: card,
                previousIndex: originalIndex!,
                newIndex
            }));
    }

    // could be nonsense, generated by AI
    private async animateProgrammaticReorder(itemCards: ItemCard<T>[]) {
        // Wait for any pending DOM updates
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const cardViews = this.cardViews();
        if (cardViews.length <= 1) return;
        
        // Store original positions before sorting
        const getId = this.getId();
        const originalPositions = cardViews.map((view, index) => {
            const element = view.nativeElement;
            const itemCard = itemCards[index];
            return {
                element,
                rect: element.getBoundingClientRect(),
                itemId: itemCard ? getId(itemCard.item) : null,
                originalIndex: index
            };
        }).filter(pos => pos.itemId !== null);
        
        // Temporarily sort to determine new order
        const tempItemCards = [...itemCards];
        this.sort(tempItemCards);
        
        // Create mapping from item ID to new index
        const newIndexMap = new Map(tempItemCards.map((card, index) => [getId(card.item), index]));
        
        // Calculate target positions for each element
        const animations: Array<{ element: HTMLElement; deltaX: number; deltaY: number }> = [];
        
        originalPositions.forEach(({ element, rect, itemId, originalIndex }) => {
            if (itemId === null) return;
            
            const newIndex = newIndexMap.get(itemId);
            if (newIndex === undefined || newIndex === originalIndex) return;
            
            // Get the element that's currently in the target position
            const targetView = cardViews[newIndex];
            if (!targetView) return;
            
            const targetRect = targetView.nativeElement.getBoundingClientRect();
            const deltaX = rect.left - targetRect.left;
            const deltaY = rect.top - targetRect.top;
            
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                animations.push({ element, deltaX, deltaY });
            }
        });
        
        // Apply animations if any movements are needed
        if (animations.length > 0) {
            // Apply initial transforms
            animations.forEach(({ element, deltaX, deltaY }) => {
                element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
                element.style.transition = 'none';
                element.style.zIndex = '10';
            });
            
            // Trigger animations
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            animations.forEach(({ element }) => {
                element.style.transition = 'transform 300ms cubic-bezier(0.25, 0.8, 0.25, 1)';
                element.style.transform = '';
            });
            
            // Clean up after animation
            setTimeout(() => {
                animations.forEach(({ element }) => {
                    element.style.transition = '';
                    element.style.zIndex = '';
                });
            }, 300);
            
            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, 300));
        }
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