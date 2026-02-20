import { Component, inject, signal, viewChild } from '@angular/core';
import { InterpolationParameters, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon';
import CollapseComponent from '../collapse/collapse';

@Component({
    selector: 'app-error-message',
    imports: [CollapseComponent, IconComponent],
    template: `
        <app-collapse>
            <div class="row no-wrap danger-text">
                <app-icon icon="error_circle" filled size="xs"/>
                {{ error() }}
            </div>
        </app-collapse>
    `,
    styleUrl: './error-message.scss'
})
export default class ErrorMessageComponent {

    protected readonly translateService = inject(TranslateService);

    private readonly collapse = viewChild.required(CollapseComponent);
    
    private hasError = false;
    protected readonly error = signal<string | null>(null);

    setError(error: string | null, params?: InterpolationParameters) {
        this.hasError = Boolean(error);
        if (error) {
            const msg = this.translateService.instant(error, params);
            this.error.set(msg);
        }
        this.collapse().setExpanded(this.hasError);
    }

    getError() {
        return this.hasError ? this.error() : null;
    }
}
