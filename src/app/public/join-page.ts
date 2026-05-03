import { AsyncButton } from '@/shared/form/button/async/async-button';
import { Icon } from "@/shared/icon/icon";
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { xcomputed } from '@/shared/utils/signal-utils';
import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Page } from '../shared/page/page';
import { AuthProviderButtons } from './shared/auth-provider-buttons';
import { Captcha } from "./shared/captcha";
import { Credentials } from './shared/credentials';
import { environment } from '@root/src/environments/environment';

@Component({
    selector: 'app-join-page',
    templateUrl: './join-page.html',
        imports: [AsyncButton, Credentials, LocalizePipe, AuthProviderButtons, Icon, Captcha],
    host: { class: 'page portrait' },
})
export class JoinPage extends Page implements OnInit {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly functions = inject(FunctionsService);
    private readonly supabase = inject(SupabaseService);
    private readonly language = inject(LanguageService);
    private readonly credentials = viewChild.required(Credentials);

    protected readonly error = signal<string | null>(null);
    protected readonly unitName = signal<string | null>(null);
    protected readonly token = signal<string | null>(null);
    protected readonly unitId = signal<number | null>(null);

    protected readonly redirectUrl = xcomputed([this.token, this.unitId],
        (token, unitId) => token && unitId ? `${window.location.origin}/join?unit=${unitId}&token=${token}` : undefined);

    protected turnstileToken: string | null = null;

    constructor() {
        super();
        const unitId = this.route.snapshot.queryParamMap.get('unit');
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!unitId || !token) this.error.set('JOIN_PAGE.ERROR_MSG.EXPIRED_OR_INVALID');
        this.unitId.set(Number(unitId));
        this.token.set(token);
    }

    async ngOnInit() {
        const unitId = this.unitId(), token = this.token();
        if (!unitId || !token) {
            this.error.set('JOIN_PAGE.ERROR_MSG.EXPIRED_OR_INVALID');
            return;
        }
        const session = await this.supabase.getSession();
        if (session) {
            if (session.unit)
                return void await this.router.navigate(['/']);
            try {
                await this.functions.call('auth/join-with-provider', { unitId, token });
                await this.supabase.refreshSession();
                await this.router.navigate(['/']);
            } catch {
                this.error.set('ERROR.FAILED');
            }
        } else {
            const { unit, error } = await this.functions.call('auth/preview-join-link', { unitId, token });
            if (error) {
                switch (error) {
                    case 'invitation_invalid_or_expired':
                        this.error.set('JOIN_PAGE.ERROR_MSG.EXPIRED_OR_INVALID');
                        break;
                    default:
                        this.error.set('ERROR.FAILED');
                }
                return;
            }
            this.unitName.set(unit.name);
        }
    }

    protected readonly joinWithPassword = async () => {
        const unitId = this.unitId();
        const token = this.token();
        if (!unitId || !token) throw 'ERROR.FAILED';
        if (!this.credentials().valid())
            throw 'LOGIN.ERROR_MSG.INVALID_INPUT';
        const captchaToken = this.turnstileToken ?? '';
        if (!captchaToken && environment.production)
            throw 'REGISTER.ERROR_MSG.CAPTCHA_REQUIRED';
        const { email, password } = this.credentials().getCredentials();
        try {
            await this.functions.call('auth/register-with-password',
                { email, password, captchaToken, unit: { id: unitId, token }, language: this.language.current() });
        } catch (err: any) {
            if (typeof err?.message === 'string') {
                if (err.message.includes('user_already_exists'))
                    throw 'REGISTER.ERROR_MSG.USER_ALREADY_EXISTS';
                if (err.message.includes('captcha invalid'))
                    throw 'REGISTER.ERROR_MSG.CAPTCHA_REQUIRED';
            }
            throw 'ERROR.FAILED';
        }
        await this.router.navigate(['/confirm-email']);
    }
}