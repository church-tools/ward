import { Session as SupabaseAuthSession } from '@supabase/supabase-js';

type SupabaseUser = SupabaseAuthSession['user'];

type AccessTokenPayload = Partial<Record<keyof SessionClaims, unknown>>;

type CachedAuthState = {
    tokenSession: SupabaseAuthSession;
    claims: SessionClaims;
    cachedAt: number;
};

const STARTUP_SESSION_TIMEOUT_MS = 600;
const SESSION_LOOKUP_TIMEOUT_MS = 500;

export type SessionClaims = {
    sub?: SupabaseUser['id'];
    email?: SupabaseUser['email'];
    unit?: string;
    unit_approved?: boolean | null;
    is_admin: boolean;
    exp?: number;
};

export class SupabaseAuthSessionStore {

    private claims: SessionClaims | null = null;
    private initPromise: Promise<void> | null = null;
    private refreshPromise: Promise<void> | null = null;
    private readonly cacheKey: string;

    constructor(
        appId: string,
        private readonly fetchSessionToken: () => Promise<SupabaseAuthSession | null>,
        private readonly onSyncRequested: (tokenSession: SupabaseAuthSession, unit: string) => void,
        private readonly onUserChanged: (user: SupabaseUser | null) => void,
    ) {
        this.cacheKey = `${appId}-cached-auth-state`;
    }

    public async initialize() {
        this.initPromise ??= this.initializeState();
        await this.initPromise;
    }

    public async getSession() {
        await this.initialize();

        if (this.claims) {
            this.refreshInBackground();
            return this.claims;
        }

        if (!navigator.onLine)
            return null;

        const liveSession = await this.getSessionWithTimeout(SESSION_LOOKUP_TIMEOUT_MS);
        if (!liveSession?.access_token)
            return null;

        await this.applySession(liveSession, false);
        this.requestSync(liveSession);
        return this.claims;
    }

    public async applySession(tokenSession: SupabaseAuthSession, requestSync: boolean) {
        const claims = this.createSessionClaims(tokenSession);
        this.claims = claims;
        this.onUserChanged(tokenSession.user);
        this.writeCachedState({ tokenSession, claims, cachedAt: Date.now() });

        if (requestSync)
            this.requestSync(tokenSession, claims.unit);
    }

    public clear() {
        this.clearState();
        localStorage.removeItem(this.cacheKey);
        this.initPromise = null;
    }

    private async initializeState() {
        const liveSession = await this.getSessionWithTimeout(STARTUP_SESSION_TIMEOUT_MS);
        if (liveSession?.access_token) {
            await this.applySession(liveSession, false);
            this.requestSync(liveSession);
            return;
        }

        const cachedState = this.readCachedState();
        if (!cachedState) {
            this.clearState();
            return;
        }

        this.claims = cachedState.claims;
        this.onUserChanged(cachedState.tokenSession.user);
        this.requestSync(cachedState.tokenSession, this.claims.unit);
    }

    private requestSync(tokenSession: SupabaseAuthSession, unit = this.claims?.unit) {
        if (!unit) return;
        this.onSyncRequested(tokenSession, unit);
    }

    private refreshInBackground() {
        if (!navigator.onLine || this.refreshPromise)
            return;

        this.refreshPromise = (async () => {
            const liveSession = await this.getSessionWithTimeout(SESSION_LOOKUP_TIMEOUT_MS);
            if (!liveSession?.access_token)
                return;
            await this.applySession(liveSession, false);
            this.requestSync(liveSession);
        })().finally(() => {
            this.refreshPromise = null;
        });
    }

    private async getSessionWithTimeout(timeoutMs: number) {
        const liveSession = this.fetchSessionToken().catch(() => null);
        let timeoutHandle: number | undefined;
        const timeout = new Promise<null>(resolve => {
            timeoutHandle = window.setTimeout(() => resolve(null), timeoutMs);
        });
        const result = await Promise.race([liveSession, timeout]);
        if (timeoutHandle !== undefined)
            window.clearTimeout(timeoutHandle);
        return result;
    }

    private writeCachedState(state: CachedAuthState) {
        localStorage.setItem(this.cacheKey, JSON.stringify(state));
    }

    private readCachedState(): CachedAuthState | null {
        const raw = localStorage.getItem(this.cacheKey);
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw) as Partial<CachedAuthState> | null;
            if (!parsed?.tokenSession?.access_token || !parsed.claims)
                return null;
            return {
                tokenSession: parsed.tokenSession,
                claims: this.normalizeSessionClaims(parsed.claims),
                cachedAt: typeof parsed.cachedAt === 'number' ? parsed.cachedAt : Date.now(),
            };
        } catch {
            return null;
        }
    }

    private clearState() {
        this.claims = null;
        this.onUserChanged(null);
    }

    private createSessionClaims(tokenSession: SupabaseAuthSession): SessionClaims {
        const tokenClaims = this.decodeAccessToken(tokenSession.access_token);
        return {
            ...tokenClaims,
            sub: tokenSession.user.id,
            email: tokenSession.user.email,
        };
    }

    private decodeAccessToken(token: string) {
        const payload = token.split('.')[1];
        if (!payload)
            return { is_admin: false };

        try {
            const base64Payload = payload
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(Math.ceil(payload.length / 4) * 4, '=');
            const decodedPayload = JSON.parse(atob(base64Payload)) as AccessTokenPayload;
            return this.normalizeSessionClaims(decodedPayload);
        } catch {
            return { is_admin: false };
        }
    }

    private normalizeSessionClaims(raw: Partial<SessionClaims> | AccessTokenPayload): SessionClaims {
        const unit = typeof raw.unit === 'number' || typeof raw.unit === 'string'
            ? String(raw.unit)
            : undefined;
        return {
            sub: typeof raw.sub === 'string' ? raw.sub : undefined,
            email: typeof raw.email === 'string' ? raw.email : undefined,
            unit,
            unit_approved: raw.unit_approved === null || typeof raw.unit_approved === 'boolean'
                ? raw.unit_approved
                : undefined,
            is_admin: raw.is_admin === true,
            exp: typeof raw.exp === 'number' ? raw.exp : undefined,
        };
    }
}