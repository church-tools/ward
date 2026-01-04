import { inject, Injectable } from '@angular/core';
import { compressTimestamp } from '../utils/date-utils';
import { SupabaseService } from './supabase.service';

// bucket: https://dash.cloudflare.com/3c3155295fbc389206f88a353d79c3a1/r2/default/buckets/ward-tools

@Injectable({ providedIn: 'root' })
export class FileStorageService {

    private readonly supabase = inject(SupabaseService);

    async upload(file: File, onProgress?: (progress: number) => void): Promise<string> {
        const key = compressTimestamp(); 
        const url = await this.getPresignedUrl(key, 'PUT');
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
        });
        return key;
    }

    async read(key: string): Promise<string> {
        const url = await this.getPresignedUrl(key, 'GET');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Read failed: ${response.status}`);
        return response.text();
    }

    async delete(key: string): Promise<void> {
        const url = await this.getPresignedUrl(key, 'DELETE');
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
    }

    private async getPresignedUrl(key: string, method: string): Promise<string> {
        const { url } = await this.supabase.callEdgeFunction<{ url: string }>('presign-file-access', { key, method });
        return url;
    }
}
