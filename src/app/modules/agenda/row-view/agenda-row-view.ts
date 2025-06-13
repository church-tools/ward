import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AgendaItem {
    id: string;
    title: string;
    time?: string;
    description?: string;
    presenter?: string;
    duration?: number;
}

@Component({
    selector: 'app-agenda-row-view',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="agenda-row" [class.completed]="isCompleted">
        </div>
    `,
    styles: [`
        .agenda-row {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
            transition: background-color 0.2s;
        }
        
        .agenda-row:hover {
            background-color: #f5f5f5;
        }
        
        .agenda-row.completed {
            opacity: 0.6;
            text-decoration: line-through;
        }
        
        .time-column {
            min-width: 80px;
            margin-right: 16px;
            text-align: center;
        }
        
        .time {
            font-weight: 600;
            display: block;
        }
        
        .duration {
            font-size: 0.8em;
            color: #666;
        }
        
        .content-column {
            flex: 1;
        }
        
        .title {
            margin: 0 0 4px 0;
            font-size: 1.1em;
            font-weight: 500;
        }
        
        .description {
            margin: 0 0 4px 0;
            color: #666;
            font-size: 0.9em;
        }
        
        .presenter {
            font-style: italic;
            color: #888;
            font-size: 0.9em;
        }
        
        .actions-column {
            margin-left: 16px;
        }
        
        .toggle-btn {
            background: none;
            border: 1px solid #ccc;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .toggle-btn:hover {
            background-color: #e0e0e0;
        }
    `]
})
export class AgendaRowViewComponent {
    @Input({ required: true }) item!: AgendaItem;
    @Input() isCompleted: boolean = false;

    toggleComplete(): void {
        this.isCompleted = !this.isCompleted;
    }
}