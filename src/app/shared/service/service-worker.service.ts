import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerService {
    
    private readonly swUpdate = inject(SwUpdate);
    private readonly translate = inject(TranslateService);

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
            if (this.shouldPromptForUpdate())
                this.promptUserForUpdate();
            else
                this.activateUpdate();
        });
    }

    private handleUnrecoverableState(): void {
        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('Service worker in unrecoverable state:', event.reason);
            this.notifyUserOfError();
        });
    }

    private shouldPromptForUpdate(): boolean {
        // You can add your own logic here to determine when to prompt
        // For example, check if user is idle, or based on app criticality
        return true;
    }

    private promptUserForUpdate(): void {
        if (confirm(this.translate.instant('SERVICE_WORKER.UPDATE_AVAILABLE')))
            this.activateUpdate();
    }

    private activateUpdate(): void {
        this.swUpdate.activateUpdate().then(() => {
            console.log('Service worker update activated');
            window.location.reload();
        });
    }

    private notifyUserOfError(): void {
        console.error('Application is in an unrecoverable state. Please refresh the page.');
        // You might want to show a user-friendly error message here
        if (confirm(this.translate.instant('SERVICE_WORKER.ERROR_REFRESH'))) {
            window.location.reload();
        }
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
