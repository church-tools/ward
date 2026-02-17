import { inject, Injectable, signal } from '@angular/core';
import { createClient, User } from '@supabase/supabase-js';
import type { Database } from '../../../../database';
import { environment } from '../../../environments/environment';
import { AgendaViewService } from '../../modules/agenda/agenda-view.service';
import { CallingViewService } from '../../modules/calling/calling-view.service';
import { AgendaItemViewService } from '../../modules/item/agenda-item-view.service';
import { MemberViewService } from '../../modules/member/member-view.service';
import { ProfileViewService } from '../../modules/profile/profile-view.service';
import type { TableInfoAdditions, TableName } from '../../modules/shared/table.types';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import { SupaSyncTableInfos } from '../utils/supa-sync/supa-sync.types';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';
import { getSiteOrigin } from '../utils/url-utils';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

export type Session = { user: User; unit?: string, unit_approved?: boolean | null, is_admin: boolean };

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    readonly client = createClient<Database>(environment.supabaseUrl, environment.pubSupabaseKey);
    readonly sync = new SupaSync<Database, TableInfoMap>(this.client, {
        unit: { deletable: false },
        profile: { indexed: { email: String, unit_approved: Boolean },
            getSearchString: inject(ProfileViewService).toString },
        agenda: { orderKey: 'position',
            getSearchString: inject(AgendaViewService).toString },
        agenda_section: { orderKey: 'position', indexed: { agenda: Number, type: String } },
        agenda_item: { createOffline: true, orderKey: 'position',
            indexed: { agenda: Number, type: String, assigned_to: Number },
            getSearchString: inject(AgendaItemViewService).toString },
        calling: { createOffline: true, orderKey: 'position', indexed: {},
            getSearchString: inject(CallingViewService).toString },
        member: { indexed: { unit: Number, profile: Number },
            getSearchString: inject(MemberViewService).toString }
    } as SupaSyncTableInfos<Database>);

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

    private decodeAccessToken(token: string) {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
}