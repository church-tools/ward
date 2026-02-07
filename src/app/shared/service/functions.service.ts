import { inject, Injectable } from '@angular/core';
import { FileUrl } from '../utils/file-utils';
import { SupabaseService } from './supabase.service';

export type UnitInfo = { id: number; name: string, created_by: string };

@Injectable({ providedIn: 'root' })
export class FunctionsService {

    private readonly supabase = inject(SupabaseService);

    loginWithPassword(email: string, password: string) {
        return this.call<{ session: any; error: any }>('login-with-password', { email, password });
    }

    listUnits() {
        return this.call<{ units: { id: number, name: string }[] }>('list-units');
    }

    createUnit(name: string) {
        return this.call<{ unit: any }>('create-unit', { name });
    }

    listUnapprovedUnits() {
        return this.call<{ units: UnitInfo[] }>('list-unapproved-units');
    }

    setUnitApproved(unitId: number, approved: boolean) {
        return this.call('set-unit-approved', { unit_id: unitId, approved });
    }

    joinUnit(unitId: number) {
        return this.call<{ profile: any }>('join-unit', { unit_id: unitId });
    }

    approveUser(profileId: number, approve: boolean) {
        return this.call('approve-user', { profile_id: profileId, approve });
    }

    setUserAdmin(profileId: number, setAdmin: boolean) {
        return this.call('set-user-admin', { profile_id: profileId, set_admin: setAdmin });
    }

    uploadFile(key: string, file: File) {
        return this.call('upload-file', { key }, file);
    }

    presignFileAccess(key: string, method: 'GET' | 'DELETE') {
        return this.call<{ url: FileUrl }>('presign-file-access', { key, method });
    }

    private async call<T>(fn: string, body?: Record<string, unknown>, file?: File): Promise<T> {
        const session = await this.supabase.getSessionToken();
        const accessToken = session?.access_token;
        const headers: Record<string, string> = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        let requestBody: BodyInit | undefined;

        if (file) {
            const form = new FormData();
            for (const [k, v] of Object.entries(body ?? {}))
                form.append(k, String(v));
            form.append('file', file, file.name);
            requestBody = form;
        } else if (body) {
            requestBody = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(`/api/${fn}`, { method: 'POST', headers, body: requestBody });

        if (!res.ok) {
            const message = await res.text().catch(() => '');
            throw new Error(`Function ${fn} failed (${res.status}): ${message}`);
        }

        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) return await res.json();
        return await res.text() as T;
    }

}
