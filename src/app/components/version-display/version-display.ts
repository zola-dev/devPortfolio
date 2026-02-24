import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Version, CommitInfo } from '../../core/services/version';
import { UpdateApp } from '../../core/services/update-app';
import { CommitHistory } from '../commit-history/commit-history';

@Component({
  selector: 'app-version-display',
  standalone: true,
  imports: [CommonModule, CommitHistory],
  templateUrl: './version-display.html',
  styleUrl: './version-display.css',
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

    if (versionInfo.history && versionInfo.history.length) {
      this.commitHistory.set(versionInfo.history);
      this.hasHistory.set(true);
    }
  }

  onVersionClick() {
    if (this.canCheckUpdates()) {
      this.updateService.checkForUpdate();
    }
  }

  toggleHistory() {
    this.showHistory.update((v) => !v);
  }
}