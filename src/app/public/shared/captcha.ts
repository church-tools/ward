import { Component, DOCUMENT, inject, OnDestroy, OnInit, output, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { WindowService } from '../../shared/service/window.service';
import { attachScript } from '../../shared/utils/dom-utils';
import CollapseComponent from '../../shared/widget/collapse/collapse';

export type Credentials = {
	email: string;
	password: string;
};

@Component({
	selector: 'app-captcha',
	template: `
        <app-collapse [show]="visible()">
            <div class="cf-turnstile"
                [attr.data-sitekey]="siteKey"
                [attr.data-theme]="windowService.darkColorScheme() ? 'dark' : 'light'"
                data-size="normal"
                data-callback="onCaptchaSolved"
                data-error-callback="onCaptchaError">
            </div>
        </app-collapse>
	`,
	imports: [CollapseComponent],
    styles: [`
        .cf-turnstile {
            min-height: 69.5px;
        }
    `],
})
export class CaptchaComponent implements OnInit, OnDestroy {
    
    private readonly document = inject(DOCUMENT);
    protected readonly windowService = inject(WindowService);
    protected readonly siteKey = environment.turnstileSiteKey;

    readonly onSolved = output<string>();

    protected readonly visible = signal(false);
    
    public ngOnInit(): void {
        (this.document.defaultView as any)['onCaptchaSolved'] = this.onSolved.emit;
        (this.document.defaultView as any)['onCaptchaError'] = (err: string) => {
            this.visible.set(true);
            console.error('Captcha error:', err);
        };
        attachScript(this.document, 'https://challenges.cloudflare.com/turnstile/v0/api.js', { async: true, defer: true });
    }

    public ngOnDestroy(): void {
        delete (this.document.defaultView as any)['onCaptchaSolved'];
    }

}

