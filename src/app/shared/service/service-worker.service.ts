import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { PopoverService } from '../widget/popover/popover.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerService {
    
    private readonly swUpdate = inject(SwUpdate);

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
        ).subscribe(({ current, available }) => {
            console.log(`Current version: ${current.hash}`);
            console.log(`Available version: ${available.hash}`);
            this.promptUserForUpdate();
        });
    }

    private handleUnrecoverableState(): void {
        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('Service worker in unrecoverable state:', event.reason);
            this.notifyUserOfError();
        });
    }

    promptUserForUpdate(): void {
        const namespace = 'SERVICE_WORKER.UPDATE_AVAILABLE';
        inject(PopoverService).confirm(`${namespace}.TITLE`, `${namespace}.MESSAGE`,
            `${namespace}.CONFIRM`, `${namespace}.CANCEL`)
            .then(confirmed => confirmed ? this.activateUpdate() : null);
    }

    private activateUpdate(): void {
        this.swUpdate.activateUpdate().then(() => {
            console.log('Service worker update activated');
            window.location.reload();
        });
    }

    private notifyUserOfError(): void {
        console.error('Application is in an unrecoverable state. Please refresh the page.');
        const namespace = 'SERVICE_WORKER.ERROR_REFRESH';
        inject(PopoverService).confirm(`${namespace}.TITLE`, `${namespace}.MESSAGE`,
            `${namespace}.CONFIRM`, `${namespace}.CANCEL`)
            .then(confirmed => confirmed ? window.location.reload() : null);
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
