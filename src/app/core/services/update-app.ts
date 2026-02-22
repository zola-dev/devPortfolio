import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Version } from './version';

@Injectable({
  providedIn: 'root',
})
export class UpdateApp {
  private swUpdate = inject(SwUpdate);
  private version = inject(Version);
/**
 * Initializes the service worker update lifecycle.
 * Checks for updates immediately on startup, then polls every 6 hours.
 * Listens for new version events and prompts the user to update.
 * Also handles unrecoverable service worker states by prompting a reload.
 */
  async execute() {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker is NOT enabled');
      return;
    }

    console.log('Service Worker is enabled');

    this.checkForUpdates();

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async (event) => {
        const versionInfo = await this.version.getVersionInfo();
        this.showUpdatePrompt(versionInfo);
      });

    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('App is in unrecoverable state:', event.reason);
      this.showUnrecoverableError();
    });
  }

  private checkForUpdates() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.checkForUpdate();

    timer(6 * 60 * 60 * 1000, 6 * 60 * 60 * 1000).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {});
    });
  }

  private async showUpdatePrompt(versionInfo: any) {
    const randomDelay = Math.floor(Math.random() * (20 - 5 + 1) + 15) * 1000;
    const commit = versionInfo.commit;

    const commitMessage = commit?.message || 'New features and improvements';
    const commitHash = commit?.hash
      ? `<code class="commit-hash">${commit.hash.substring(0, 7)}</code>`
      : '';
    const commitAuthor = commit?.author || '';
    const commitDate = commit?.date
      ? new Date(commit.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '';

    const bodyHtml = commit?.body
      ? `<p class="commit-body">${commit.body.replace(/\n/g, '<br>')}</p>`
      : '';

    const statsHtml = commit?.stats
      ? `<p class="commit-stats">${commit.stats}</p>`
      : '';

    const tagHtml = commit?.tag
      ? `<span class="commit-tag">${commit.tag}</span>`
      : '';

    const changedFilesHtml = commit?.changedFiles?.length
      ? `<details class="changed-files">
          <summary>${commit.changedFiles.length} files changed</summary>
          <ul>
            ${commit.changedFiles.slice(0, 5).map((f: string) => `<li>${f}</li>`).join('')}
            ${commit.changedFiles.length > 5 ? `<li>...and ${commit.changedFiles.length - 5} more</li>` : ''}
          </ul>
        </details>`
      : '';

    let timerIntervalId: ReturnType<typeof setInterval> | undefined;

    const result = await Swal.fire({
      title: 'Update Available',
      html: `
        <div class="update-info">
          <div class="version-badge">
            <span class="version-label">Version:</span>
            <span class="version-number">${versionInfo.version || '1.0.0'}</span>
            ${tagHtml}
          </div>
          
          ${commitHash ? `
            <div class="commit-section">
              <div class="commit-header">
                <span class="commit-icon">📝</span>
                ${commitHash}
              </div>
              <p class="commit-message">${commitMessage}</p>
              ${bodyHtml}
              ${changedFilesHtml}
              ${statsHtml}
              ${commitAuthor ? `<p class="commit-author">${commitAuthor}</p>` : ''}
              ${commitDate ? `<p class="commit-date">${commitDate}</p>` : ''}
            </div>
          ` : `
            <p class="update-message">${commitMessage}</p>
          `}

          <div class="update-timer">
            Updating in <b></b> seconds...
          </div>
        </div>
      `,
      icon: 'info',
      timer: randomDelay,
      timerProgressBar: true,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: 'Update Now',
      cancelButtonText: 'Later',
      allowOutsideClick: false,
      background: '#1f2937',
      color: '#ffffff',
      iconColor: '#8b5cf6',
      customClass: {
        popup: 'pwa-update-popup',
        confirmButton: 'pwa-confirm-btn',
        cancelButton: 'pwa-cancel-btn'
      },
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        const b = content?.querySelector('b');
        if (b) {
          timerIntervalId = setInterval(() => {
            const timeLeft = Swal.getTimerLeft();
            if (b && timeLeft !== undefined) {
              b.textContent = Math.ceil(timeLeft / 1000).toString();
            }
          }, 100);
        }
      },
      didClose: () => {
        if (timerIntervalId !== undefined) {
          clearInterval(timerIntervalId);
          timerIntervalId = undefined;
        }
      }
    });

    if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
      this.activateUpdate();
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      timer(60 * 60 * 1000).pipe(take(1)).subscribe(() => {
        this.swUpdate.checkForUpdate();
      });
    }
  }

  private activateUpdate() {
    Swal.fire({
      title: 'Updating...',
      html: 'Please wait while we update the app...',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      background: '#1f2937',
      color: '#ffffff',
      iconColor: '#8b5cf6',
      didOpen: () => Swal.showLoading()
    });

    this.swUpdate.activateUpdate().then(() => {
      timer(2000).pipe(take(1)).subscribe(() => {
        const timestamp = new Date().getTime();
        window.location.href = `${window.location.origin}${window.location.pathname}?updated=${timestamp}`;
      });
    }).catch(() => {
      Swal.fire({
        title: 'Update Failed',
        text: 'Unable to update the app. Please refresh manually.',
        icon: 'error',
        background: '#1f2937',
        color: '#ffffff'
      });
    });
  }

  private showUnrecoverableError() {
    Swal.fire({
      title: '⚠️ App Needs Refresh',
      text: 'The application is in an inconsistent state and needs to be reloaded.',
      icon: 'warning',
      confirmButtonText: '🔄 Reload',
      allowOutsideClick: false,
      background: '#1f2937',
      color: '#ffffff',
      iconColor: '#f59e0b'
    }).then((result) => {
      if (result.isConfirmed) window.location.reload();
    });
  }

  async checkForUpdate() {
    if (!this.swUpdate.isEnabled) return false;

    try {
      const updateAvailable = await this.swUpdate.checkForUpdate();
      if (!updateAvailable) {
        Swal.fire({
          title: 'You\'re Up to Date!',
          text: 'No updates available at this time.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#1f2937',
          color: '#ffffff',
          iconColor: '#10b981'
        });
      }
      return updateAvailable;
    } catch (err) {
      console.error('Error checking for update:', err);
      return false;
    }
  }
}