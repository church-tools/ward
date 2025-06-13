import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../database';
import { environment } from '../../environments/environment';
import { Synced } from './synced';
import { getSiteOrigin } from './utils/url-utils';

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);

    readonly collection = {
        agenda: new Synced(this.client, 'agenda', 'id'),
    } as const;

    constructor() {
        this.client.auth.getUser()
        .then(({ data: { user } }) => {
            if (!user?.id)
                throw 'User not authenticated, syncing will not work';
            for (const collection of Object.values(this.collection))
                collection.setup(user);
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

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (event: any, session: any) => void) {
        return this.client.auth.onAuthStateChange(callback);
    }
}