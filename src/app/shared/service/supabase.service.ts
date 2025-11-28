import { Injectable, signal } from '@angular/core';
import { createClient, User } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import { getSiteOrigin } from '../utils/url-utils';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);
    readonly sync = new SupaSync<Database, TableInfoMap>(this.client, [
        { name: 'unit', createOffline: false },
        { name: 'profile', createOffline: false, indexed: ['uid'] },
        { name: 'agenda', createOffline: false, orderKey: 'position' },
        { name: 'agenda_section', createOffline: false, orderKey: 'position', indexed: ['agenda', 'type'] },
        { name: 'task', orderKey: 'position', indexed: ['agenda', 'stage'] },
        { name: 'calling', orderKey: 'position', indexed: [] },
        { name: 'member', createOffline: false, indexed: ['unit', 'profile'] }
    ]);
    private readonly _user = signal<User | null>(null);
    public readonly user = this._user.asReadonly();

    constructor() {
        this.client.auth.onAuthStateChange(async (event, session) => {
            if (!session?.access_token) return;
            switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                {
                    this._user.set(session.user);
                    const { unit } = this.getDataFromAccessToken(session.access_token);
                    this.sync.init(session, `${environment.appId}-${unit}`);
                    break;
                }
                case 'SIGNED_OUT': {
                    this.sync.cleanup();
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

    getDataFromAccessToken(token: string) {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
}