import { inject, Injectable } from '@angular/core';
import type { FunctionParams, FunctionResult, FunctionRoute, FunctionRouteMap } from './functions.routes.generated';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FunctionsService {

    private readonly supabase = inject(SupabaseService);

    listUnits() {
        return this.call('list-units');
    }

    createUnit(name: string) {
        return this.call('create-unit', { name });
    }

    listUnapprovedUnits() {
        return this.call('list-unapproved-units');
    }

    setUnitApproved(unitId: number, approved: boolean) {
        return this.call('set-unit-approved', { unit_id: unitId, approved });
    }

    joinUnit(unitId: number) {
        return this.call('join-unit', { unit_id: unitId });
    }

    uploadFile(key: string, file: File) {
        return this.call('upload-file', { key }, file);
    }

    presignFileAccess(key: string, method: 'GET' | 'DELETE') {
        return this.call('presign-file-access', { key, method });
    }

    listPosters(key: string) {
        return this.call('list-posters', { key });
    }

    readonly call = <TRoute extends FunctionRoute>(fn: TRoute, body?: FunctionParams<TRoute>, file?: File): Promise<FunctionResult<TRoute>> => {
        return this.invoke(fn, body, file) as Promise<FunctionResult<TRoute>>;
    };

    private async invoke(fn: FunctionRoute, body?: any, file?: File): Promise<FunctionResult<FunctionRoute>> {
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
        return await res.text() as any;
    }

}
