import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import type { SupaSyncTableInfo } from '../utils/supa-sync/supa-sync.types';
import { getSiteOrigin } from '../utils/url-utils';

type TableInfo<T extends TableName> = SupaSyncTableInfo<Database, T> & TableInfoAdditions<T>;

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);
    readonly supaSync = new SupaSync<Database, TableInfoAdditions>(this.client, [
        { name: 'profile' },
        { name: 'agenda', createOffline: false, orderKey: 'position' },
        { name: 'agenda_section', createOffline: false, orderKey: 'position', indexed: ['agenda'] },
        { name: 'task', orderKey: 'position', indexed: ['agenda'] },
    ]);

    constructor() {
        this.client.auth.onAuthStateChange(async (event, session) => {
            if (!session?.access_token) return;
            switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                {
                    const { unit } = this.getDataFromAccessToken(session.access_token);
                    this.supaSync.init(session, `${environment.appId}-${unit}`);
                    break;
                }
                case 'SIGNED_OUT': {
                    this.supaSync.cleanup();
                    break;
                }
            }
        });
    }

    async signUp(email: string, password: string) {
        return await this.client.auth.signUp({ email, password });
    }

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

    async signOut() {
        return await this.client.auth.signOut();
    }

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