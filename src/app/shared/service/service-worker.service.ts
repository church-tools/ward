import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerService {
    
    private readonly swUpdate = inject(SwUpdate);

    private readonly updateAvailableSubject = new Subject<void>();
    readonly updateAvailable$ = this.updateAvailableSubject.asObservable();

    private readonly unrecoverableSubject = new Subject<string>();
    readonly unrecoverable$ = this.unrecoverableSubject.asObservable();

    constructor() {
        if (!this.swUpdate.isEnabled) {
            console.log('Service Worker is not enabled');
            return;
        }
        this.checkForUpdates();
        this.handleVersionUpdates();
        this.handleUnrecoverableState();
    }

    private checkForUpdates(): void {
        setInterval(async () => {
            await this.swUpdate.checkForUpdate();
            console.log('Checked for service worker updates');
        }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
    }

    private handleVersionUpdates(): void {
        this.swUpdate.versionUpdates.pipe(
            filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
            map(event => ({
                current: event.currentVersion,
                available: event.latestVersion
            }))
        ).subscribe(async ({ current, available }) => {
            console.log(`Current version: ${current.hash}`);
            console.log(`Available version: ${available.hash}`);
            await this.swUpdate.activateUpdate();
            this.updateAvailableSubject.next();
        });
    }

    private handleUnrecoverableState(): void {
        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('Service worker in unrecoverable state:', event.reason);
            this.unrecoverableSubject.next(event.reason);
        });
    }

    /**
     * Manually check for updates
     */
    public checkForUpdate(): Promise<boolean> {
        return this.swUpdate.checkForUpdate();
    }

    /**
     * Get version info
     */
    public getVersionInfo() {
        return this.swUpdate.versionUpdates.pipe(
            filter(event => event.type === 'VERSION_DETECTED' || event.type === 'VERSION_READY'),
            map(event => ({
                type: event.type,
                current: 'currentVersion' in event ? event.currentVersion : null,
                available: 'latestVersion' in event ? event.latestVersion : null
            }))
        );
    }
}
