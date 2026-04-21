import { AgendaViewService } from '@/modules/agenda/agenda-view.service';
import { AgendaItemViewService } from '@/modules/agenda/item/agenda-item-view.service';
import { CallingCalculated } from '@/modules/calling/calling-calculated';
import { CallingViewService } from '@/modules/calling/calling-view.service';
import { MemberCallingCalculated } from '@/modules/member-calling/member-calling-calculated';
import { MemberCallingViewService } from '@/modules/member-calling/member-calling-view.service';
import { MemberViewService } from '@/modules/member/member-view.service';
import { OrganizationViewService } from '@/modules/organization/organization-view.service';
import { ProfileViewService } from '@/modules/profile/profile-view.service';
import { MessageCalculated } from '@/modules/sacrament-meeting/item/message/message-calculated';
import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import type { CalculatedMap, TableInfoAdditions, TableName } from '@/modules/shared/table.types';
import { inject, Injectable, signal } from '@angular/core';
import type { Database } from '@root/database';
import { createClient, Session as SupabaseAuthSession, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SessionClaims, SupabaseAuthSessionStore } from './supabase-auth-session';
import { SupaSync } from '../utils/supa-sync/supa-sync';
import type { SupaSyncTableInfos } from '../utils/supa-sync/supa-sync.types';
import { SupaSyncedRow } from '../utils/supa-sync/supa-synced-row';
import { getSiteOrigin } from '../utils/url-utils';

type TableInfoMap = { [K in TableName]: TableInfoAdditions<K> };

export type SupabaseRow<T extends TableName> = SupaSyncedRow<Database, T>;

export type Session = SessionClaims;

@Injectable({ providedIn: 'root' })
export class SupabaseService {

    public static instance: SupabaseService | undefined;

    readonly client = createClient<Database>(environment.supabaseUrl, environment.pubSupabaseKey);
    readonly sync = new SupaSync<Database, TableInfoMap, CalculatedMap>(this.client, {
        unit: { deletable: false },
        profile: { indexed: { email: String, unit_approved: Boolean },
            getSummaryString: inject(ProfileViewService).toString },
        agenda: { orderKey: 'position', indexed: { weekday: Number, organizations: Number },
            getSummaryString: inject(AgendaViewService).toString },
        agenda_section: { orderKey: 'position', indexed: { agenda: Number, type: String } },
        agenda_item: { createOffline: true, orderKey: 'position',
            indexed: { agenda: Number, type: String, assigned_to: Number },
            getSummaryString: inject(AgendaItemViewService).toString },
        calling: { orderKey: 'position', indexed: { organization: Number },
            calculated: CallingCalculated,
            getSummaryString: inject(CallingViewService).toString },
        member: { indexed: { profile: Number },
            getSummaryString: inject(MemberViewService).toString },
        member_calling: { idKeys: ['member', 'calling'], createOffline: true,
            indexed: { member: Number, calling: Number, state: String },
            calculated: MemberCallingCalculated,
            getSummaryString: inject(MemberCallingViewService).toString },
        message: { createOffline: true, orderKey: 'position',
            indexed: { sacrament_meeting: Number, speaker: String },
            calculated: MessageCalculated },
        hymn: { createOffline: true, orderKey: 'position',
            indexed: { sacrament_meeting: Number, number: Number } },
        musical_performance: { createOffline: true, orderKey: 'position',
            indexed: { sacrament_meeting: Number } },
        sacrament_meeting: { version: 1, idKeys: ['week'],
            indexed: {
                week: Number,
                type: String,
                opening_hymn: Number,
                sacrament_hymn: Number,
                closing_hymn: Number,
            },
            getSummaryString: inject(SacramentMeetingViewService).toString },
        organization: { orderKey: 'position',
            getSummaryString: inject(OrganizationViewService).toString },
    } as unknown as SupaSyncTableInfos<Database, TableInfoMap, CalculatedMap>);

    private readonly _user = signal<User | null>(null);
    public readonly user = this._user.asReadonly();
    private readonly authSession = new SupabaseAuthSessionStore(
        environment.appId,
        this.getSessionToken.bind(this),
        (tokenSession, unit) => this.startSyncInitialization(tokenSession, unit),
        user => this._user.set(user),
    );
    private syncDbName: string | null = null;

    constructor() {
        SupabaseService.instance = this;
        this.client.auth.onAuthStateChange(async (event, session) => {
            switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                {
                    if (!session?.access_token) return;
                    await this.authSession.applySession(session);
                    break;
                }
                case 'SIGNED_OUT': {
                    this.authSession.clear();
                    await this.handleSignedOut();
                    break;
                }
            }
        });
    }

    async initializeAuthAndSync() {
        await this.authSession.initialize();
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
        return await this.authSession.getSession();
    }

    async refreshSession() {
        const { data, error } = await this.client.auth.refreshSession();
        if (error) throw error;
        if (data.session?.access_token)
            await this.authSession.applySession(data.session);
        return data.session;
    }

    private startSyncInitialization(tokenSession: SupabaseAuthSession, unit: string) {
        if (!unit) return;
        // Startup should not block route activation on slow network.
        void this.initSyncIfNeeded(tokenSession, unit, false).catch(() => null);
    }

    private async initSyncIfNeeded(tokenSession: SupabaseAuthSession, unit: string, awaitInitialSync = true) {
        const dbName = `${environment.appId}-${unit}`;
        if (this.syncDbName === dbName) return;
        if (this.syncDbName && this.syncDbName !== dbName)
            await this.sync.cleanup();
        await this.sync.init(tokenSession, dbName, awaitInitialSync);
        this.syncDbName = dbName;
    }

    private async handleSignedOut() {
        this.syncDbName = null;
        await this.sync.cleanup();
    }
}