import { Component, signal, viewChild } from '@angular/core';
import { IconComponent } from '../../icon/icon';
import CollapseComponent from '../collapse.component';

@Component({
    selector: 'app-error-message',
    imports: [CollapseComponent, IconComponent],
    template: `
        <app-collapse>
            <div class="row no-wrap danger-text">
                <app-icon icon="error_circle" [filled]="true" size="xs"/>
                {{error()}}
            </div>
        </app-collapse>
    `,
    styleUrl: './error-message.scss'
})
export default class ErrorMessageComponent {

    private readonly collapse = viewChild.required(CollapseComponent);
    
    private hasError = false;
    protected readonly error = signal<string | null>(null);

    setError(error: string | null) {
        this.hasError = Boolean(error);
        if (error) this.error.set(error);
        this.collapse().setExpanded(this.hasError);
    }

    getError() {
        return this.hasError ? this.error() : null;
    }
}
