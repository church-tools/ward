import { inject, Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import { AsyncState } from '../utils/async-state';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import { getSiteOrigin } from '../utils/url-utils';
import { WindowService } from './window.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    private readonly windowService = inject(WindowService);
    readonly client = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);
    readonly sync = new AsyncState<SupaSync<Database>>();

    constructor() {
        this.client.auth.onAuthStateChange(async (event, session) => {
            if (!session?.access_token) return;
            switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                {
                    const { unit } = this.getDataFromAccessToken(session.access_token);
                    await this.client.realtime.setAuth(session.access_token);
                    const sync = await SupaSync.setup<Database>(
                        this.client,
                        session.user,
                        this.windowService.onlineState,
                        {
                            name: `${environment.appId}-${unit}`,
                            version: 1,
                            tables: {
                                profile: {},
                                agenda: {},
                                task: { agenda: {} },
                            }
                        }
                    );
                    this.sync.set(sync);
                    break;
                }
                case 'SIGNED_OUT': {
                    this.sync.unsafeGet()?.cleanup();
                    this.sync.unset();
                    break;
                }
            }
        });
    }

    /**
     * Sign up a new user with email and password
     */
    async signUp(email: string, password: string) {
        return await this.client.auth.signUp({ email, password });
    }

    /**
     * Sign in an existing user with email and password
     */
    async signIn(email: string, password: string) {
        return await this.client.auth.signInWithPassword({ email, password });
    }

    async signInWithOAuth(provider: 'google' | 'azure') {
        const { data, error } = await this.client.auth.signInWithOAuth({
            provider,
            options: {
                scopes: 'email',
                redirectTo: getSiteOrigin(),
            },
        });
        if (error) throw error;
        return data;
    }

    /**
     * Sign out the current user
     */
    async signOut() {
        return await this.client.auth.signOut();
    }

    /**
     * Get current session data
     */
    async getSession() {
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;
        return data.session;
    }

    private getDataFromAccessToken(token: string) {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
}