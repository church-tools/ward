import { inject, Injectable } from '@angular/core';
import { generateHash } from '../utils/crypto-utils';
import { SupabaseService } from './supabase.service';

// bucket: https://dash.cloudflare.com/3c3155295fbc389206f88a353d79c3a1/r2/default/buckets/ward-tools

export interface UploadOptions {
    folder: string;
    onProgress?: (progress: number) => void;
}

@Injectable({ providedIn: 'root' })
export class FileStorageService {
    private readonly supabase = inject(SupabaseService);

    async upload(file: File, options: UploadOptions): Promise<string> {
        const key = `${generateHash(1)}_${file.name}`; 
        const { url, headers } = await this.supabase.callEdgeFunction<{ url: string; headers: Record<string, string> }>(
            'presign-file-access',
            { key, method: 'PUT', content_type: file.type || 'application/octet-stream' });
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => e.lengthComputable && options.onProgress?.(Math.round((e.loaded / e.total) * 100));
            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.open('PUT', url);
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
            xhr.send(file);
        });
        return key;
    }

    async read(key: string): Promise<string> {
        const { url } = await this.supabase.callEdgeFunction<{ url: string }>('presign-file-access', { key, method: 'GET' });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Read failed: ${response.status}`);
        return response.text();
    }

    async delete(key: string): Promise<void> {
        const { url } = await this.supabase.callEdgeFunction<{ url: string }>('presign-file-access', { key, method: 'DELETE' });
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
    }
}
