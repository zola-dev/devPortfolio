import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Version } from '../../core/services/version';
import { UpdateApp } from '../../core/services/update-app';
@Component({
  selector: 'app-version-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-display.html',
  styleUrl: './version-display.css',
})
export class VersionDisplay implements OnInit {
    version = '...';
    commitHash = '';
    canCheckUpdates = false;
    
    private versionService = inject(Version);
    private updateService = inject(UpdateApp);
  
    async ngOnInit() {
      // Učitaj informacije o verziji
      const versionInfo = await this.versionService.getVersionInfo();
      this.version = versionInfo.version;
      this.commitHash = versionInfo.commit?.shortHash || '';
      
      // Proveri da li je production (samo u production-u može da proverava update-e)
      this.canCheckUpdates = versionInfo.environment === 'production';
    }
  
    onVersionClick() {
      if (this.canCheckUpdates) {
        this.updateService.checkForUpdate();
      }
    }
  }

