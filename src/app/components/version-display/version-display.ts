import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Version, CommitInfo } from '../../core/services/version';
import { UpdateApp } from '../../core/services/update-app';

@Component({
  selector: 'app-version-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="version-container" [class.clickable]="canCheckUpdates()" (click)="onVersionClick()">
      <div class="version-info">
        <span class="version-label">v</span>
        <span class="version-number">{{ version() }}</span>
        @if (commitHash()) {
          <span class="commit-hash">{{ commitHash() }}</span>
        }
        @if (hasHistory()) {
          <span class="history-icon" (click)="toggleHistory($event)">📜</span>
        }
      </div>
      
      @if (canCheckUpdates()) {
        <div class="update-hint">
          <span class="hint-icon">🔄</span>
          <span class="hint-text">Click to check for updates</span>
        </div>
      }

      <!-- History Dropdown -->
      @if (showHistory()) {
        <div class="history-dropdown" (click)="$event.stopPropagation()">
          <div class="history-header">
            <h4>Commit History</h4>
            <button (click)="toggleHistory($event)">✕</button>
          </div>
          
          <div class="history-list">
            @for (commit of commitHistory(); track commit.hash) {
              <div class="commit-item">
                <div class="commit-header-item">
                  <code class="commit-hash-item">{{ commit.shortHash }}</code>
                  <span class="commit-date">{{ formatDate(commit.date) }}</span>
                </div>
                <p class="commit-message">{{ commit.message }}</p>
                @if (commit.body) {
                  <p class="commit-body">{{ commit.body }}</p>
                }
                <div class="commit-meta">
                  <span class="commit-author">👤 {{ commit.author }}</span>
                  @if (commit.stats) {
                    <span class="commit-stats">{{ commit.stats }}</span>
                  }
                </div>
                @if (commit.changedFiles?.length) {
                  <details class="changed-files">
                    <summary>{{ commit.changedFiles.length }} files changed</summary>
                    <ul>
                      @for (file of commit.changedFiles.slice(0, 5); track file) {
                        <li>{{ file }}</li>
                      }
                      @if (commit.changedFiles.length > 5) {
                        <li>...and {{ commit.changedFiles.length - 5 }} more</li>
                      }
                    </ul>
                  </details>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .version-container {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 8px 16px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      transition: all 0.3s ease;
    }

    .version-container.clickable {
      cursor: pointer;
    }

    .version-container.clickable:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .version-info {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .version-label {
      font-size: 12px;
      color: #a78bfa;
      font-weight: 600;
    }

    .version-number {
      font-size: 14px;
      color: #e5e7eb;
      font-weight: 700;
    }

    .commit-hash {
      font-size: 11px;
      color: #9ca3af;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .history-icon {
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .history-icon:hover {
      transform: scale(1.2);
    }

    .update-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #9ca3af;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .version-container.clickable:hover .update-hint {
      opacity: 1;
    }

    .hint-icon {
      font-size: 12px;
      animation: rotate 2s linear infinite;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .hint-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* History Dropdown */
    .history-dropdown {
      position: absolute;
      bottom: 100%;
      right: 0;
      width: 400px;
      max-height: 500px;
      background: #1f2937;
      border: 1px solid #8b5cf6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 1000;
      margin-bottom: 8px;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.2);
      border-bottom: 1px solid rgba(139, 92, 246, 0.3);
    }

    .history-header h4 {
      margin: 0;
      color: #e5e7eb;
      font-size: 14px;
    }

    .history-header button {
      background: none;
      border: none;
      color: #e5e7eb;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    }

    .history-list {
      max-height: 450px;
      overflow-y: auto;
      padding: 12px;
    }

    .commit-item {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(139, 92, 246, 0.1);
      border-left: 3px solid #8b5cf6;
      border-radius: 4px;
    }

    .commit-header-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .commit-hash-item {
      font-size: 11px;
      color: #a78bfa;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .commit-date {
      font-size: 10px;
      color: #9ca3af;
    }

    .commit-message {
      font-weight: 600;
      margin: 8px 0;
      color: #e5e7eb;
      font-size: 13px;
    }

    .commit-body {
      font-size: 11px;
      color: #9ca3af;
      white-space: pre-wrap;
      margin: 4px 0;
    }

    .commit-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 8px;
    }

    .commit-author,
    .commit-stats {
      font-size: 10px;
    }

    .changed-files {
      margin-top: 8px;
      font-size: 11px;
      color: #9ca3af;
    }

    .changed-files summary {
      cursor: pointer;
      user-select: none;
    }

    .changed-files ul {
      list-style: none;
      padding-left: 12px;
      margin: 4px 0;
    }

    .changed-files li {
      font-family: monospace;
      color: #6ee7b7;
      font-size: 10px;
      padding: 2px 0;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .version-container {
        padding: 6px 12px;
      }
      
      .version-number {
        font-size: 12px;
      }
      
      .hint-text {
        display: none;
      }

      .history-dropdown {
        width: 90vw;
        right: auto;
        left: 50%;
        transform: translateX(-50%);
      }
    }
  `]
})
export class VersionDisplay implements OnInit {
  private versionService = inject(Version);
  private updateService = inject(UpdateApp);
  
  version = signal('...');
  commitHash = signal('');
  canCheckUpdates = signal(false);
  showHistory = signal(false);
  commitHistory = signal<CommitInfo[]>([]);
  hasHistory = signal(false);

  async ngOnInit() {
    const versionInfo = await this.versionService.getVersionInfo();
    this.version.set(versionInfo.version);
    this.commitHash.set(versionInfo.commit?.shortHash || '');
    this.canCheckUpdates.set(versionInfo.environment === 'production');
    
    if (versionInfo.history && versionInfo.history.length > 0) {
      this.commitHistory.set(versionInfo.history);
      this.hasHistory.set(true);
    }
  }

  onVersionClick() {
    if (this.canCheckUpdates()) {
      this.updateService.checkForUpdate();
    }
  }

  toggleHistory(event: Event) {
    event.stopPropagation();
    this.showHistory.update(v => !v);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}