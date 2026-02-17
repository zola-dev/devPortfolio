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

  async execute() {
    if (!this.swUpdate.isEnabled) {
      console.log('🚫 Service Worker is NOT enabled!');
      return;
    }

    console.log('✅ Service Worker is enabled!');

    // Periodički proveri za update (svakih 6 sati)
    this.checkForUpdates();

    // Slušaj za dostupne update-e
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(async (event) => {
        console.log('🎉 New version available!', event);
        
        // Učitaj informacije o novoj verziji
        const versionInfo = await this.version.getVersionInfo();
        
        this.showUpdatePrompt(versionInfo);
      });

    // Proveri za neobrađene update-e
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('❌ App is in unrecoverable state:', event.reason);
      this.showUnrecoverableError();
    });
  }

  private checkForUpdates() {
    if (!this.swUpdate.isEnabled) return;

    // Proveri odmah
    this.swUpdate.checkForUpdate().then(updateAvailable => {
      console.log(updateAvailable ? '📦 Update found!' : '✨ App is up to date');
    });

    // Proveri svakih 6 sati
    timer(0, 6 * 60 * 60 * 1000).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(err => {
        console.error('Error checking for updates:', err);
      });
    });
  }

  private async showUpdatePrompt(versionInfo: any) {
    const randomDelay = Math.floor(Math.random() * (7 - 2 + 1) + 2) * 1000;

    // Formatiranje commit poruke za HTML
    const commitMessage = versionInfo.commit?.message || 'New features and improvements';
    const commitHash = versionInfo.commit?.hash ? 
      `<code class="commit-hash">${versionInfo.commit.hash.substring(0, 7)}</code>` : '';
    const commitAuthor = versionInfo.commit?.author || 'Developer';
    const commitDate = versionInfo.commit?.date ? 
      new Date(versionInfo.commit.date).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

    const result = await Swal.fire({
      title: '🚀 Update Available!',
      html: `
        <div class="update-info">
          <div class="version-badge">
            <span class="version-label">Version:</span>
            <span class="version-number">${versionInfo.version || '1.0.0'}</span>
          </div>
          
          ${commitHash ? `
            <div class="commit-section">
              <div class="commit-header">
                <span class="commit-icon">📝</span>
                ${commitHash}
              </div>
              <p class="commit-message">${commitMessage}</p>
              ${commitAuthor ? `<p class="commit-author">👤 ${commitAuthor}</p>` : ''}
              ${commitDate ? `<p class="commit-date">📅 ${commitDate}</p>` : ''}
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
      confirmButtonText: '✨ Update Now',
      cancelButtonText: '⏰ Later',
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
          setInterval(() => {
            const timeLeft = Swal.getTimerLeft();
            if (b && timeLeft) {
              b.textContent = Math.ceil(timeLeft / 1000).toString();
            }
          }, 100);
        }
      }
    });

    // Ako korisnik klikne "Update Now" ili timer istekne
    if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
      this.activateUpdate();
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      // Korisnik je kliknuo "Later" - podseti ga za 1 sat
      timer(60 * 60 * 1000)
        .pipe(take(1))
        .subscribe(() => {
          this.swUpdate.checkForUpdate();
        });
    }
  }

  private activateUpdate() {
    Swal.fire({
      title: '⚡ Updating...',
      html: 'Please wait while we update the app...',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      background: '#1f2937',
      color: '#ffffff',
      iconColor: '#8b5cf6',
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.swUpdate.activateUpdate().then(() => {
      timer(2000)
        .pipe(take(1))
        .subscribe(() => {
          // Dodaj timestamp da izbegneš cache
          const timestamp = new Date().getTime();
          const newUrl = `${window.location.origin}${window.location.pathname}?updated=${timestamp}`;
          window.location.href = newUrl;
        });
    }).catch(err => {
      console.error('Error activating update:', err);
      Swal.fire({
        title: '❌ Update Failed',
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
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }

  /**
   * Ručno proveri za update (pozovi iz UI-ja)
   */
  async checkForUpdate() {
    if (!this.swUpdate.isEnabled) {
      console.warn('Service Worker is not enabled');
      return false;
    }

    try {
      const updateAvailable = await this.swUpdate.checkForUpdate();
      if (!updateAvailable) {
        Swal.fire({
          title: '✨ You\'re Up to Date!',
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

