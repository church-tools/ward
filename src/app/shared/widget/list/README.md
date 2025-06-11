# List Component

A flexible and reusable Angular 20 list component that supports templates, selection, filtering, and loading states.

## Features

- ✅ **Template-based rendering**: Use Angular templates to customize how each item is displayed
- ✅ **Selection support**: Single or multi-select capabilities with visual feedback
- ✅ **Loading states**: Built-in loading and empty state handling
- ✅ **Filtering**: Support for custom filter functions
- ✅ **Accessibility**: Proper ARIA attributes and keyboard navigation
- ✅ **Type-safe**: Full TypeScript support with generics
- ✅ **Modern Angular**: Uses Angular 20 features like signals, inputs, and outputs

## Basic Usage

```typescript
import { Component } from '@angular/core';
import { ListComponent, ListItem } from './shared/widget/list';

interface Person extends ListItem {
  id: number;
  name: string;
  email: string;
}

@Component({
  template: `
    <app-list [items]="people">
      <ng-template let-person>
        <div>
          <h3>{{ person.name }}</h3>
          <p>{{ person.email }}</p>
        </div>
      </ng-template>
    </app-list>
  `,
  imports: [ListComponent]
})
export class MyComponent {
  people: Person[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
}
```

## Configuration Options

The component accepts a `config` input with the following options:

```typescript
interface ListConfig {
  emptyMessage?: string;      // Message when no items (default: "No items found")
  loadingMessage?: string;    // Message when loading (default: "Loading...")
  showIndex?: boolean;        // Show item index numbers (default: false)
  selectable?: boolean;       // Enable item selection (default: false)
  multiSelect?: boolean;      // Allow multiple selection (default: false)
}
```

## Advanced Examples

### Selectable List with Multi-Selection

```typescript
@Component({
  template: `
    <app-list 
      [items]="people" 
      [config]="{ selectable: true, multiSelect: true, showIndex: true }"
      (selectionChange)="onSelectionChange($event)">
      <ng-template let-person let-selected="selected">
        <div [class.selected]="selected">
          {{ person.name }}
        </div>
      </ng-template>
    </app-list>
  `
})
export class SelectableListComponent {
  onSelectionChange(selected: Person[]) {
    console.log('Selected items:', selected);
  }
}
```

### Filtered List

```typescript
@Component({
  template: `
    <app-list 
      [items]="people" 
      [filter]="adminFilter">
      <ng-template let-person>
        <div>{{ person.name }} - {{ person.role }}</div>
      </ng-template>
    </app-list>
  `
})
export class FilteredListComponent {
  adminFilter = (person: Person) => person.role === 'admin';
}
```

### Loading and Empty States

```typescript
@Component({
  template: `
    <app-list 
      [items]="people" 
      [loading]="isLoading"
      [config]="{ 
        loadingMessage: 'Fetching users...', 
        emptyMessage: 'No users found' 
      }">
      <ng-template let-person>
        <div>{{ person.name }}</div>
      </ng-template>
    </app-list>
  `
})
export class LoadingListComponent {
  isLoading = true;
  people: Person[] = [];
}
```

## Template Context

The template receives the following context:

- `$implicit`: The current item
- `index`: The current index (0-based)
- `selected`: Whether the item is selected (boolean)

```typescript
<ng-template let-person let-index="index" let-selected="selected">
  <div>
    Item #{{ index + 1 }}: {{ person.name }}
    @if (selected) {
      <span>✓ Selected</span>
    }
  </div>
</ng-template>
```

## Events

### selectionChange
Emitted when the selection changes (only when `selectable: true`):

```typescript
(selectionChange)="onSelectionChange($event)"
```

### itemClick
Emitted when an item is clicked:

```typescript
(itemClick)="onItemClick($event)"
```

The event object contains:
```typescript
{
  item: T;      // The clicked item
  index: number; // The item's index
}
```

## Methods

### Selection Methods
- `selectItem(item: T)`: Select a specific item
- `clearSelection()`: Clear all selections
- `selectAll()`: Select all visible items (multi-select only)
- `getSelectedItems()`: Get array of selected items
- `isSelected(item: T)`: Check if item is selected

## Styling

The component provides CSS custom properties for theming:

```css
.list-component {
  --color-text-secondary: #6b7280;
  --color-bg-hover: rgba(0, 0, 0, 0.05);
  --color-bg-selected: rgba(59, 130, 246, 0.1);
  --color-border-selected: rgba(59, 130, 246, 0.3);
  --color-bg-secondary: #f3f4f6;
}
```

## CSS Classes

- `.list-container`: Main container
- `.list-items`: Container for all items
- `.list-item`: Individual item wrapper
- `.list-item.selectable`: Selectable item
- `.list-item.selected`: Selected item
- `.item-index`: Index number display
- `.item-content`: Item content wrapper

## Requirements

- Angular 20+
- Items must extend the `ListItem` interface (have an `id` property)
- Template must be provided using `<ng-template>` with `let-item` syntax

## TypeScript Support

The component is fully typed and supports generics:

```typescript
interface CustomItem extends ListItem {
  id: string;
  customProperty: string;
}

// Type-safe usage
<app-list<CustomItem> [items]="customItems">
  <ng-template let-item>
    {{ item.customProperty }} <!-- Fully typed! -->
  </ng-template>
</app-list>
```
