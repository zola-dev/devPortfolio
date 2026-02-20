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
  history?: CommitInfo[];
}

@Injectable({
  providedIn: 'root',
})
export class Version {
  private http = inject(HttpClient);
  private versionInfo: VersionInfo | null = null;

  /**
   * Loads version information from version.json file
   * This file is generated during the build process
   */
  async getVersionInfo(): Promise<VersionInfo> {
    if (this.versionInfo) {
      return this.versionInfo;
    }

    try {
      const timestamp = new Date().getTime();
      this.versionInfo = await firstValueFrom(
        this.http.get<VersionInfo>(`/version.json?t=${timestamp}`)
      );
      return this.versionInfo;
    } catch (error) {
      console.warn('Could not load version.json, using fallback', error);
      return {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        environment: 'production'
      };
    }
  }

  /**
   * Display version information in console with fancy formatting
   */
  async logVersionInfo() {
    const info = await this.getVersionInfo();
    
    console.log(
      '%c🚀 App Version Info ',
      'background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;'
    );
    
    const tableData: Record<string, any> = {
      'Version': info.version,
      'Build Date': new Date(info.buildDate).toLocaleString('en-US'),
      'Environment': info.environment,
    };

    if (info.commit) {
      tableData['Commit Hash'] = info.commit.shortHash;
      tableData['Commit Message'] = info.commit.message;
      tableData['Author'] = info.commit.author;
      tableData['Branch'] = info.commit.branch;
      tableData['Total Commits'] = info.commit.totalCommits;
      if (info.commit.tag) tableData['Tag'] = info.commit.tag;
      if (info.commit.stats) tableData['Stats'] = info.commit.stats;
      if (info.commit.changedFiles?.length) {
        tableData['Changed Files'] = info.commit.changedFiles.length;
      }
    }

    console.table(tableData);

    if (info.commit?.body) {
      console.log('%cBody:', 'color: #8b5cf6; font-weight: bold;');
      console.log(info.commit.body);
    }

    if (info.commit?.coAuthors && info.commit.coAuthors.length > 0) {
      console.log('%cCo-Authors:', 'color: #8b5cf6; font-weight: bold;');
      info.commit.coAuthors.forEach(ca => {
        console.log(`  - ${ca.name} <${ca.email}>`);
      });
    }

    if (info.commit?.changedFiles && info.commit.changedFiles.length > 0) {
      console.log('%cChanged Files:', 'color: #8b5cf6; font-weight: bold;');
      info.commit.changedFiles.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (info.commit.changedFiles.length > 10) {
        console.log(`  ... and ${info.commit.changedFiles.length - 10} more`);
      }
    }
  }

  /**
   * Format version for UI display
   */
  async getFormattedVersion(): Promise<string> {
    const info = await this.getVersionInfo();
    if (info.commit?.shortHash) {
      return `v${info.version} (${info.commit.shortHash})`;
    }
    return `v${info.version}`;
  }

  /**
   * Get version string only
   */
  async getVersion(): Promise<string> {
    const info = await this.getVersionInfo();
    return info.version;
  }

  /**
   * Check if application is in production mode
   */
  async isProduction(): Promise<boolean> {
    const info = await this.getVersionInfo();
    return info.environment === 'production';
  }
}