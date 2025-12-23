import { Injectable, signal } from '@angular/core';
import { createClient, FunctionInvokeOptions, User } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import { getSiteOrigin } from '../utils/url-utils';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

export type Session = { user: User; unit: string, is_admin: boolean };

export type EdgeFunction = 'login-with-password' | 'list-units' | 'create-unit' | 'fetch-unapproved-units'
    | 'set-unit-approved';

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
                    this.client.functions.setAuth(session.access_token);
                    this._user.set(session.user);
                    const { unit } = this.decodeAccessToken(session.access_token);
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

    async callEdgeFunction(fn: EdgeFunction, body?: FunctionInvokeOptions['body']) {
        // Always call via same-origin proxy path (dev proxy locally, Vercel rewrite in prod)
        // to avoid browser CORS preflight issues against the Supabase Functions endpoint.
        return await this.callEdgeFunctionViaProxy(fn, body);
    }

    private async callEdgeFunctionViaProxy(fn: EdgeFunction, body?: FunctionInvokeOptions['body']) {
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;

        const accessToken = data.session?.access_token;
        const headers: Record<string, string> = { apikey: environment.supabaseKey };
        // Supabase expects an Authorization header; use user token when available, else anon key.
        headers['Authorization'] = `Bearer ${accessToken ?? environment.supabaseKey}`;
        const url = `/supabase/functions/v1/${fn}`;
        const requestBody = body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));
        if (requestBody !== undefined) headers['Content-Type'] = 'application/json';
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: requestBody,
        });
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