import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cache } from '../utils/cache';
import { FileKey, FileUrl } from '../utils/file-utils';

// bucket: https://dash.cloudflare.com/3c3155295fbc389206f88a353d79c3a1/r2/default/buckets/ward-tools

@Injectable({ providedIn: 'root' })
export class FileStorageService {

    private readonly supabase = inject(SupabaseService);
    private readonly cache = new Cache<string, File>(64);

    async upload(file: File, key: FileKey): Promise<void> {
        await this.supabase.callEdgeFunction('presign-file-access', { key, method: 'PUT' }, file);
        this.cache.set(key, file);
    }

    async getUrl(key: FileKey, method: 'GET' | 'DELETE'): Promise<FileUrl> {
        const { url } = await this.supabase.callEdgeFunction<{ url: FileUrl }>('presign-file-access', { key, method });
        return url;
    }

    getCached(key: FileKey): File | undefined {
        return this.cache.get(key);
    }

    async read(key: FileKey, name: string): Promise<File> {
        const cached = this.cache.get(key);
        if (cached) return cached;
        const url = await this.getUrl(key, 'GET');
        return await this.loadUrl(key, url, name);
    }

    async delete(key: FileKey): Promise<void> {  
        const url = await this.getUrl(key, 'DELETE');
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
    }

    async loadUrl(key: FileKey, url: FileUrl, name: string): Promise<File> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Read failed: ${response.status}`);
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') ?? blob.type;
        const file = new File([blob], name, { type: contentType });
        this.cache.set(key, file);
        return file;
    }
}
