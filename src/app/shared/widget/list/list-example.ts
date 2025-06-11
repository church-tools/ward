import { Component, signal } from '@angular/core';
import { ListComponent, ListItem, ListConfig } from './list';

// Example data interface that extends ListItem
interface Person extends ListItem {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-list-example',
  imports: [ListComponent],
  template: `
    <div class="example-container">
      <h2>List Component Examples</h2>
      
      <!-- Basic List Example -->
      <section class="example-section">
        <h3>Basic List</h3>
        <app-list [items]="people()" [config]="basicConfig">
          <ng-template let-person let-index="index">
            <div class="person-card">
              <div class="person-info">
                <h4>{{ person.name }}</h4>
                <p>{{ person.email }}</p>
                <span class="role">{{ person.role }}</span>
              </div>
            </div>
          </ng-template>
        </app-list>
      </section>

      <!-- Selectable List Example -->
      <section class="example-section">
        <h3>Selectable List with Index</h3>
        <app-list 
          [items]="people()" 
          [config]="selectableConfig"
          (selectionChange)="onSelectionChange($event)">
          <ng-template let-person let-index="index" let-selected="selected">
            <div class="person-card" [class.selected]="selected">
              <div class="person-info">
                <h4>{{ person.name }}</h4>
                <p>{{ person.email }}</p>
                <span class="role">{{ person.role }}</span>
              </div>
            </div>
          </ng-template>
        </app-list>
        
        @if (selectedPeople().length > 0) {
          <div class="selection-info">
            Selected: {{ selectedPeople().map(p => p.name).join(', ') }}
          </div>
        }
      </section>

      <!-- Filtered List Example -->
      <section class="example-section">
        <h3>Filtered List (Admins only)</h3>
        <app-list 
          [items]="people()" 
          [config]="filteredConfig"
          [filter]="adminFilter">
          <ng-template let-person>
            <div class="person-card admin">
              <div class="person-info">
                <h4>{{ person.name }}</h4>
                <p>{{ person.email }}</p>
                <span class="role">{{ person.role }}</span>
              </div>
            </div>
          </ng-template>
        </app-list>
      </section>

      <!-- Loading State Example -->
      <section class="example-section">
        <h3>Loading State</h3>
        <app-list 
          [items]="[]" 
          [loading]="true"
          [config]="loadingConfig">
          <ng-template let-person>
            <div>{{ person.name }}</div>
          </ng-template>
        </app-list>
      </section>

      <!-- Empty State Example -->
      <section class="example-section">
        <h3>Empty State</h3>
        <app-list 
          [items]="[]" 
          [config]="emptyConfig">
          <ng-template let-person>
            <div>{{ person.name }}</div>
          </ng-template>
        </app-list>
      </section>
    </div>
  `,
  styles: [`
    .example-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .example-section {
      margin-bottom: 3rem;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      background: #ffffff;
    }

    .example-section h3 {
      margin-top: 0;
      color: #1f2937;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5rem;
    }

    .person-card {
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background: #f9fafb;
      transition: all 0.2s ease;

      &.selected {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      &.admin {
        border-color: #dc2626;
        background: #fef2f2;
      }
    }

    .person-info h4 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.125rem;
    }

    .person-info p {
      margin: 0 0 0.5rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .role {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #3b82f6;
      color: white;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .selection-info {
      margin-top: 1rem;
      padding: 1rem;
      background: #f0f9ff;
      border: 1px solid #0284c7;
      border-radius: 0.375rem;
      color: #0c4a6e;
      font-weight: 500;
    }
  `]
})
export class ListExampleComponent {
  // Sample data
  readonly people = signal<Person[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Admin' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User' },
  ]);

  readonly selectedPeople = signal<Person[]>([]);

  // Configuration objects
  readonly basicConfig: ListConfig = {
    emptyMessage: 'No people found'
  };

  readonly selectableConfig: ListConfig = {
    selectable: true,
    multiSelect: true,
    showIndex: true,
    emptyMessage: 'No people available for selection'
  };

  readonly filteredConfig: ListConfig = {
    emptyMessage: 'No administrators found'
  };

  readonly loadingConfig: ListConfig = {
    loadingMessage: 'Loading people...'
  };

  readonly emptyConfig: ListConfig = {
    emptyMessage: 'No data available'
  };

  // Filter function for admins only
  readonly adminFilter = (person: Person) => person.role === 'Admin';

  // Event handlers
  onSelectionChange(selectedPeople: Person[]): void {
    this.selectedPeople.set(selectedPeople);
    console.log('Selection changed:', selectedPeople);
  }
}
