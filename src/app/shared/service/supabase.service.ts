import { Injectable, signal } from '@angular/core';
import { createClient, FunctionInvokeOptions, User } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';
import { getSiteOrigin } from '../utils/url-utils';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

export type Session = { user: User; unit?: string, unit_approved?: boolean | null, is_admin: boolean };

export type EdgeFunction = 'login-with-password' | 'list-units' | 'create-unit' | 'fetch-unapproved-units'
    | 'set-unit-approved' | 'join-unit' | 'approve-user' | 'set-user-admin' | 'presign-file-access';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.pubSupabaseKey);
    readonly sync = new SupaSync<Database, TableInfoMap>(this.client, [
        { name: 'unit', createOffline: false, deletable: false },
        { name: 'profile', createOffline: false, indexed: { email: String, unit_approved: Boolean } },
        { name: 'agenda', createOffline: false, orderKey: 'position' },
        { name: 'agenda_section', createOffline: false, orderKey: 'position', indexed: { agenda: Number, type: String } },
        { name: 'agenda_item', orderKey: 'position', indexed: { agenda: Number, type: String, assigned_to: Number } },
        { name: 'calling', orderKey: 'position', indexed: {} },
        { name: 'member', createOffline: false, indexed: { unit: Number, profile: Number } }
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
                    this.client.functions.setAuth(session.access_token);
                    this._user.set(session.user);
                    const { unit } = this.decodeAccessToken(session.access_token);
                    if (unit) this.sync.init(session, `${environment.appId}-${unit}`);
                    break;
                }
                case 'SIGNED_OUT': {
                    this._user.set(null);
                    this.sync.cleanup();
                    break;
                }
            }
        });
    }

    async signUp(email: string, password: string, captchaToken: string) {
        return await this.client.auth.signUp({
            email,
            password,
            options: { captchaToken },
        });
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

    async getSessionToken() {
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
        const { data, error } = await this.client.auth.refreshSession();
        if (error) throw error;
        return data.session;
    }

    async callEdgeFunction<T>(fn: EdgeFunction, body?: FunctionInvokeOptions['body'], file?: File): Promise<T> {
        return await this.callEdgeFunctionViaProxy(fn, body, file) as T;
    }

    private async callEdgeFunctionViaProxy(fn: EdgeFunction, body?: FunctionInvokeOptions['body'], file?: File) {
        const { data } = await this.client.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error('Not authenticated');
        const init = {
            method: 'POST',
            headers: { apikey: environment.pubSupabaseKey, Authorization: `Bearer ${accessToken}` }
        } as RequestInit & { headers: Record<string, string> };
        const url = `/supabase/functions/v1/${fn}`;
        if (file) {
            const form = new FormData();
            for (const [k, v] of Object.entries(body || {}))
                form.append(k, String(v));
            form.append('file', file, file.name);
            init.body = form;
        } else if (body) {
            init.body = typeof body === 'string' ? body : JSON.stringify(body);
            init.headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(url, init);
        if (!res.ok) {
            const message = await res.text().catch(() => '');
            throw new Error(`Edge function ${fn} failed (${res.status}): ${message}`);
        }
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) return await res.json();
        return await res.text();
    }

    private decodeAccessToken(token: string) {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
}