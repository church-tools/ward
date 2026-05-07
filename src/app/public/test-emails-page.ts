import { Select } from '@/shared/form/select/select';
import { LanguageKey, SUPPORTED_LANGUAGES } from '@/shared/language/language.service';
import { Page } from '@/shared/page/page';
import { FunctionsService } from '@/shared/service/functions.service';
import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import type { AuthEmailType } from '@root/functions/api/auth/emails/auth-emails';
import { asyncComputed, xcomputed, xsignal } from '../shared/utils/signal-utils';

const EMAIL_TEMPLATE_OPTIONS = [
    { value: 'invite', view: 'Invitation' },
    { value: 'confirm', view: 'Confirmation' },
    { value: 'reset', view: 'Password reset' },
] as const;

const EMAIL_LANGUAGE_OPTIONS = Object.values(SUPPORTED_LANGUAGES).map(
    ([key, value]) => ({ value: key, view: value })) as { value: LanguageKey, view: string }[];

@Component({
    selector: 'app-test-emails-page',
    template: `
        <span class="display-text">Test E-Mails</span>

        <div class="row gap-4">
            <app-select
                label="Template"
                [options]="templateOptions"
                [value]="templateType()"
                (valueChange)="templateType.set($event)"/>
            <app-select
                label="Language"
                [options]="languageOptions"
                [value]="language()"
                (valueChange)="language.set($event)"/>
            <div class="column gap-1 flex-1 min-w-56">
                <span class="semibold-text text-muted">Subject</span>
                <div class="text-pre-wrap strong-text">{{ previewEmail().subject }}</div>
            </div>
        </div>
        <iframe
            class="full-width"
            style="min-height:760px;border:0;background:#fff;"
            frameBorder="0"
            [src]="previewUrl()"
            title="Auth email preview"></iframe>
    `,
    imports: [Select],
    host: { class: 'page narrow' },
})
export class TestEmailsPage extends Page {

    private readonly sanitizer = inject(DomSanitizer);
    private readonly functions = inject(FunctionsService);

    protected readonly templateType = xsignal<AuthEmailType | null>('invite');
    protected readonly language = xsignal<LanguageKey | null>('en');
    protected readonly previewLink = xsignal('https://example.com/auth/email-preview');
    protected readonly previewUnitName = xsignal('Ward Tools Preview Unit');

    protected readonly previewEmail = asyncComputed(
        [this.templateType, this.language, this.previewLink, this.previewUnitName],
        async (type, language, link, unitName) => {
            if (!type || !language) return { html: 'loading', subject: '', text: '' };
            return await this.functions.call("auth/emails/get-auth-email", { type, language, link, unitName });
        },
        { html: 'loading', subject: '', text: '' }
    );

    protected readonly previewUrl = xcomputed([this.previewEmail], email => {
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(email.html)}`;
        return this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
    });

    protected readonly templateOptions = EMAIL_TEMPLATE_OPTIONS;
    protected readonly languageOptions = EMAIL_LANGUAGE_OPTIONS;
}
