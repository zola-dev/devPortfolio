import { DOCUMENT, inject, Injectable, signal } from "@angular/core";
import { fromEvent, merge, take } from "rxjs";
@Injectable({ providedIn: 'root' })
export class UserInteraction {
  private readonly doc = inject(DOCUMENT);
  readonly hasInteracted = signal(false);
  constructor() {
    if (sessionStorage.getItem('userInteracted') === 'true') {
      this.hasInteracted.set(true);
      return;
    }
    merge(
      fromEvent(this.doc, 'click'),
      fromEvent(this.doc, 'keydown'),
      fromEvent(this.doc, 'touchstart')
    )
    .pipe(take(1))
    .subscribe(() => {
      sessionStorage.setItem('userInteracted', 'true');
      this.hasInteracted.set(true);
    });
  }
}