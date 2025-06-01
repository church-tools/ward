import { Injectable } from '@angular/core';
import { configureSynced } from '@legendapp/state/sync';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { ObservablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'
import { generateUUIDv7 } from '../shared/utils/crypto-utils';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseKey
        );
        const customSynced = configureSynced(syncedSupabase, {
            // Use React Native Async Storage
            persist: {
                plugin: ObservablePersistIndexedDB,
            },
            generateId: () => generateUUIDv7(),
            supabase: this.supabase,
            changesSince: 'last-sync',
            fieldCreatedAt: 'created_at',
            fieldUpdatedAt: 'modified_at',
            // Optionally enable soft deletes
            fieldDeleted: 'deleted',
        });
    }

  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  /**
   * Sign in an existing user with email and password
   */
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  /**
   * Get current session data
   */
  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    return { data, error };
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: any, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}