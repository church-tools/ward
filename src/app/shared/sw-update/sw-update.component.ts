import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceWorkerService } from '../service/service-worker.service';

@Component({
  selector: 'app-sw-update',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sw-update-banner" *ngIf="updateAvailable">
      <div class="banner-content">
        <span>🔄 New version available!</span>
        <button (click)="updateApp()" class="update-btn">Update</button>
        <button (click)="dismissUpdate()" class="dismiss-btn">Later</button>
      </div>
    </div>
  `,
  styles: [`
    .sw-update-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #4CAF50;
      color: white;
      z-index: 1000;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .banner-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .update-btn, .dismiss-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .update-btn {
      background: white;
      color: #4CAF50;
    }
    
    .dismiss-btn {
      background: transparent;
      color: white;
      border: 1px solid white;
    }
    
    .update-btn:hover {
      background: #f5f5f5;
    }
    
    .dismiss-btn:hover {
      background: rgba(255,255,255,0.1);
    }
  `]
})
export class SwUpdateComponent {
  private serviceWorkerService = inject(ServiceWorkerService);
  updateAvailable = false;

  constructor() {
    this.serviceWorkerService.getVersionInfo().subscribe(versionInfo => {
      if (versionInfo.type === 'VERSION_READY') {
        this.updateAvailable = true;
      }
    });
  }

  updateApp(): void {
    window.location.reload();
  }

  dismissUpdate(): void {
    this.updateAvailable = false;
  }
}
