import { Component, computed, contentChild, input, output, signal, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface ListItem {
    id: string | number;
}

@Component({
    selector: 'app-card-list',
    imports: [NgTemplateOutlet],
    templateUrl: './card-list.html',
})
export class CardListComponent<T extends ListItem = ListItem> {

    readonly items = input.required<T[]>();
    readonly orderByKey = input<keyof T>();
    readonly showFilter = input(false);

    readonly itemTemplate = contentChild.required(TemplateRef<{ $implicit: T; index: number; selected: boolean }>);
    
    private readonly selectedItem = signal<T | null>(null);
    readonly selection = this.selectedItem.asReadonly();
    
    // Events
    readonly itemClick = output<{ item: T; index: number }>();
    readonly selectionChange = output<T | null>();
    
    // Computed values
    readonly visibleItems = computed(() => {
        const items = this.items();
        const filterFn = this.filter();
        return filterFn ? items.filter(filterFn) : items;
    });
    
    // Track by function
    readonly trackByFn = computed(() => {
        const trackByFn = this.trackBy();
        return trackByFn || ((item: T) => item.id);
    });
    
    // Selection methods
    isSelected(item: T): boolean {
        return this.selectedItems().has(item);
    }
  
    selectItem(item: T): void {
        if (!this.config().selectable) return;
        
        const selected = new Set(this.selectedItems());
        
        if (this.config().multiSelect) {
            if (selected.has(item)) {
                selected.delete(item);
            } else {
                selected.add(item);
            }
        } else {
            selected.clear();
            selected.add(item);
        }
        
        this.selectedItems.set(selected);
        this.selectionChange.emit(Array.from(selected));
    }
    
    clearSelection(): void {
        this.selectedItems.set(new Set());
        this.selectionChange.emit([]);
    }
    
    selectAll(): void {
        if (!this.config().selectable || !this.config().multiSelect) return;
        
        const allItems = new Set(this.visibleItems());
        this.selectedItems.set(allItems);
        this.selectionChange.emit(Array.from(allItems));
    }
    
    getSelectedItems(): T[] {
        return Array.from(this.selectedItems());
    }
    
    // Event handlers
    protected onItemClick(item: T, index: number): void {
        this.itemClick.emit({ item, index });
        
        if (this.config().selectable) {
            this.selectItem(item);
        }
    }
}