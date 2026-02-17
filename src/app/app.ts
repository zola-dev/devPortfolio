import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateApp } from './core/services/update-app';
import { Version } from './core/services/version';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('devPortfolio');
  private readonly updateApp = inject(UpdateApp);
  private readonly version = inject(Version);
  // constructor(
  //   // private updateApp: UpdateApp,
  //   // private version: Version
  // ) {
  //   // this.updateApp.execute();
  //   // this.version.logVersionInfo();
  // }
  ngOnInit(): void {
    this.updateApp.execute();
    this.version.logVersionInfo();
  }
}
