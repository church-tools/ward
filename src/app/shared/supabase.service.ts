import { Injectable } from '@angular/core';
import { ObservablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb';
import { configureSynced } from '@legendapp/state/sync';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { generateUUIDv7 } from '../shared/utils/crypto-utils';
import { getSiteOrigin } from './utils/url-utils';
import { observable } from '@legendapp/state';
import { Database } from '../../../database.types';
import { Collections } from '../../../database-table.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);

    private readonly synced = configureSynced(syncedSupabase, {
        persist: { plugin: ObservablePersistIndexedDB },
        generateId: () => generateUUIDv7(),
        supabase: this.client,
        changesSince: 'last-sync',
        fieldId: 'uid',
        fieldCreatedAt: 'created_at',
        fieldUpdatedAt: 'updated_at',
        fieldDeleted: 'deleted',
    });

    public readonly profile = this.getSynced('profile');
    public readonly unit = this.getSynced('unit');
    public readonly agenda = this.getSynced('agenda');

    constructor() {}
    
    private getSynced<T extends Collections>(collection: T) {
        return observable(this.synced({
            supabase: this.client,
            collection,
            actions: ['read', 'create', 'update', 'delete'],
            realtime: true,
            persist: { name: collection, retrySync: true },
            retry: { infinite: true },
        }));
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

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (event: any, session: any) => void) {
        return this.client.auth.onAuthStateChange(callback);
    }
}