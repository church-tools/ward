import { Component, computed, contentChild, input, output, signal, TemplateRef } from '@angular/core';

export interface ListItem {
  id: string | number;
}

export interface ListConfig {
  emptyMessage?: string;
  loadingMessage?: string;
  showIndex?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
}

@Component({
  selector: 'app-list',
  templateUrl: './list.html',
  styles: [`
    .list-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .list-message {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary, #6b7280);
      font-style: italic;
    }

    .loading-message {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .list-items {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: background-color 0.2s ease;
      border-radius: 0.375rem;
      
      &.selectable {
        cursor: pointer;
        padding: 0.5rem;
        
        &:hover {
          background-color: var(--color-bg-hover, rgba(0, 0, 0, 0.05));
        }
        
        &.selected {
          background-color: var(--color-bg-selected, rgba(59, 130, 246, 0.1));
          border: 1px solid var(--color-border-selected, rgba(59, 130, 246, 0.3));
        }
      }
    }

    .item-index {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      background-color: var(--color-bg-secondary, #f3f4f6);
      border-radius: 50%;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary, #6b7280);
    }

    .item-content {
      flex: 1;
      min-width: 0; /* Allows content to shrink */
    }
  `],
})
export class ListComponent<T extends ListItem = ListItem> {

    readonly items = input.required<T[]>();
  
    // Optional configuration
    readonly config = input<ListConfig>({});
    readonly loading = input<boolean>(false);
    readonly filter = input<(item: T) => boolean>();
    readonly trackBy = input<(item: T, index: number) => any>();
    
    // Template for rendering items
    readonly itemTemplate = contentChild.required(TemplateRef<{ $implicit: T; index: number; selected: boolean }>);
    
    // Selection state
    private readonly selectedItems = signal<Set<T>>(new Set());
    readonly selection = this.selectedItems.asReadonly();
    
    // Events
    readonly itemClick = output<{ item: T; index: number }>();
    readonly selectionChange = output<T[]>();
    
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