import { inject, Injectable } from '@angular/core';
import { compressTimestamp } from '../utils/date-utils';
import { SupabaseService } from './supabase.service';

// bucket: https://dash.cloudflare.com/3c3155295fbc389206f88a353d79c3a1/r2/default/buckets/ward-tools

@Injectable({ providedIn: 'root' })
export class FileStorageService {

    private readonly supabase = inject(SupabaseService);

    async upload(file: File, onProgress?: (progress: number) => void): Promise<string> {
        const key = compressTimestamp(); 
        await this.supabase.callEdgeFunction('presign-file-access', { key, method: 'PUT' }, file);
        return key;
    }

    async read(key: string): Promise<Blob> {
        const { url } = await this.supabase.callEdgeFunction<{ url: string }>('presign-file-access', { key, method: 'GET' });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Read failed: ${response.status}`);
        return response.blob();
    }

    async delete(key: string): Promise<void> {  
        const { url } = await this.supabase.callEdgeFunction<{ url: string }>('presign-file-access', { key, method: 'DELETE' });
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
    }
}
