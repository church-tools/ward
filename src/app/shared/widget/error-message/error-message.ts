import { Component, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../../icon/icon';
import Collapse from '../collapse/collapse';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizeParameters } from '@/shared/language/localize-utils';

@Component({
    selector: 'app-error-message',
    imports: [Collapse, Icon],
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
export default class ErrorMessage {

    protected readonly language = inject(LanguageService);

    private readonly collapse = viewChild.required(Collapse);
    
    private hasError = false;
    protected readonly error = signal<string | null>(null);

    async setError(error: string | null, params?: LocalizeParameters) {
        this.hasError = Boolean(error);
        if (error) {
            const msg = await this.language.localize(error, params);
            this.error.set(msg);
        }
        this.collapse().setExpanded(this.hasError);
    }

    getError() {
        return this.hasError ? this.error() : null;
    }
}
