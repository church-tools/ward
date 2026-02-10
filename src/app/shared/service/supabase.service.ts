import { Injectable, signal } from '@angular/core';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import type { SupaSyncTableInfos } from '../utils/supa-sync/supa-sync.types';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';
import { getSiteOrigin } from '../utils/url-utils';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

export type Session = { user: User; unit?: string, unit_approved?: boolean | null, is_admin: boolean };

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    private readonly config: SupaSyncTableInfos<Database> = {
        unit: { createOffline: false, deletable: false },
        profile: { createOffline: false, indexed: { email: String, unit_approved: Boolean }, search: ['email'] },
        agenda: { createOffline: false, orderKey: 'position', search: ['name', 'abbreviation'] },
        agenda_section: { createOffline: false, orderKey: 'position', indexed: { agenda: Number, type: String } },
        agenda_item: { orderKey: 'position', indexed: { agenda: Number, type: String, assigned_to: Number }, search: ['title', 'content'] },
        calling: { orderKey: 'position', indexed: {}, search: ['name', 'full_name'] },
        member: { createOffline: false, indexed: { unit: Number, profile: Number }, search: ['first_name', 'last_name', 'nick_name'] }
    };

    private _client: SupabaseClient<Database> | null = null;
    private _sync: SupaSync<Database, TableInfoMap> | null = null;
    private _initPromise: Promise<void> | null = null;

    get client(): SupabaseClient<Database> {
        if (!this._client)
            throw new Error('Supabase client not yet initialized. Call ensureInitialized() first.');
        return this._client;
    }

    get sync(): SupaSync<Database, TableInfoMap> {
        if (!this._sync) 
            throw new Error('Supabase sync not yet initialized. Call ensureInitialized() first.');
        return this._sync;
    }

    private readonly _user = signal<User | null>(null);
    public readonly user = this._user.asReadonly();

    constructor() {}

    async ensureInitialized(): Promise<void> {
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._initialize();
        return this._initPromise;
    }

    private async _initialize(): Promise<void> {
        const { createClient } = await import('@supabase/supabase-js');
        
        this._client = createClient<Database>(environment.supabaseUrl, environment.pubSupabaseKey);
        this._sync = new SupaSync<Database, TableInfoMap>(this._client, this.config);

        this._client.auth.onAuthStateChange(async (event, session) => {
            if (!session?.access_token) return;
            switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                {
                    this._user.set(session.user);
                    const { unit } = this.decodeAccessToken(session.access_token);
                    if (unit && this._sync) this._sync.init(session, `${environment.appId}-${unit}`);
                    break;
                }
                case 'SIGNED_OUT': {
                    this._user.set(null);
                    if (this._sync) this._sync.cleanup();
                    break;
                }
            }
        });
    }

    async signUp(email: string, password: string, captchaToken: string) {
        await this.ensureInitialized();
        return await this.client.auth.signUp({
            email,
            password,
            options: { captchaToken },
        });
    }

    async signInWithOAuth(provider: 'google' | 'azure') {
        await this.ensureInitialized();
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
        await this.ensureInitialized();
        return await this.client.auth.signOut();
    }

    async getSessionToken() {
        await this.ensureInitialized();
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;
        return data.session;
    }

    async getSession(): Promise<Session | null> {
        const token = await this.getSessionToken();
        if (!token) return null;
        return this.decodeAccessToken(token.access_token);
    }

    async refreshSession() {
        await this.ensureInitialized();
        const { data, error } = await this.client.auth.refreshSession();
        if (error) throw error;
        return data.session;
    }

    private decodeAccessToken(token: string) {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
}