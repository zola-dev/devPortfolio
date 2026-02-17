import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  body: string | null;
  author: string;
  email: string;
  date: string;
  branch: string;
  tag: string | null;
  totalCommits: number;
  changedFiles: string[];
  stats: string | null;
  coAuthors: Array<{ name: string; email: string }>;
}
export interface VersionInfo {
  version: string;
  buildDate: string;
  commit?: CommitInfo;
  environment: 'production' | 'development';
}
@Injectable({
  providedIn: 'root',
})
export class Version {
  private http = inject(HttpClient);
  private versionInfo: VersionInfo | null = null;

  /**
   * Učitava informacije o verziji iz version.json fajla
   * Ovaj fajl se generiše tokom build procesa
   */
  async getVersionInfo(): Promise<VersionInfo> {
    if (this.versionInfo) {
      return this.versionInfo;
    }

    try {
      // Dodaj timestamp da izbegneš cache
      const timestamp = new Date().getTime();
      this.versionInfo = await firstValueFrom(
        this.http.get<VersionInfo>(`/assets/version.json?t=${timestamp}`)
      );
      return this.versionInfo;
    } catch (error) {
      console.warn('Could not load version.json, using fallback', error);
      // Fallback verzija ako fajl ne postoji
      return {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        environment: 'production'
      };
    }
  }

  /**
   * Prikaži verziju u konzoli sa fancy formatiranjem
   */
  async logVersionInfo() {
    const info = await this.getVersionInfo();
    
    console.log(
      '%c🚀 App Version Info ',
      'background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;'
    );
    
    console.table({
      'Version': info.version,
      'Build Date': new Date(info.buildDate).toLocaleString('sr-RS'),
      'Environment': info.environment,
      'Commit Hash': info.commit?.shortHash || 'N/A',
      'Commit Message': info.commit?.message || 'N/A',
      'Author': info.commit?.author || 'N/A',
      'Branch': info.commit?.branch || 'N/A'
    });

    if (info.commit) {
      console.log(
        `%cCommit: ${info.commit.message}`,
        'color: #10b981; font-style: italic;'
      );
    }
  }

  /**
   * Formatuj verziju za prikaz u UI-ju
   */
  async getFormattedVersion(): Promise<string> {
    const info = await this.getVersionInfo();
    if (info.commit?.shortHash) {
      return `v${info.version} (${info.commit.shortHash})`;
    }
    return `v${info.version}`;
  }

  /**
   * Dobavi samo verziju kao string
   */
  async getVersion(): Promise<string> {
    const info = await this.getVersionInfo();
    return info.version;
  }

  /**
   * Proveri da li je aplikacija u production modu
   */
  async isProduction(): Promise<boolean> {
    const info = await this.getVersionInfo();
    return info.environment === 'production';
  }
}

