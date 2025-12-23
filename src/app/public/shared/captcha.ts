import { AfterViewInit, Component, DOCUMENT, ElementRef, inject, OnDestroy, output, Signal, viewChild } from '@angular/core';
import { environment } from '../../../environments/environment';
import { WindowService } from '../../shared/service/window.service';
import { attachScript } from '../../shared/utils/dom-utils';

@Component({
	selector: 'app-captcha',
	template: `
        <div #turnstile class="cf-turnstile"></div>
	`,
    styles: [`
        .cf-turnstile {
            min-height: 69.5px;
        }
    `],
})
export class CaptchaComponent implements AfterViewInit, OnDestroy {
    
    private readonly document = inject(DOCUMENT);
    protected readonly windowService = inject(WindowService);
    protected readonly siteKey = environment.turnstileSiteKey;
	protected readonly turnstileContainer: Signal<ElementRef<HTMLDivElement>> = viewChild.required('turnstile', { read: ElementRef });

	private widgetId: string | null = null;

    readonly onSolved = output<string>();

    async ngAfterViewInit(): Promise<void> {
        await attachScript(this.document, 'https://challenges.cloudflare.com/turnstile/v0/api.js', { async: true, defer: true });
        const win = this.document.defaultView as any;
        const api = win?.turnstile;
        if (!api?.render) throw new Error('Turnstile API not available');

        const container = this.turnstileContainer().nativeElement;
        container.innerHTML = '';
        if (this.widgetId && api.remove) api.remove(this.widgetId);

        this.widgetId = api.render(container, {
            sitekey: this.siteKey,
            theme: this.windowService.darkColorScheme() ? 'dark' : 'light',
            size: 'normal',
            callback: (token: string) => this.onSolved.emit(token),
            'error-callback': (err: unknown) => console.error('Captcha error:', err),
        });
    }

    public ngOnDestroy(): void {
        const win = this.document.defaultView as any;
        try { if (this.widgetId && win?.turnstile?.remove) win.turnstile.remove(this.widgetId); } catch { }
        this.widgetId = null;
    }

}

