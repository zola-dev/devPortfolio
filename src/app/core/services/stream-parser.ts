import { Injectable, DestroyRef, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/* ================= TYPES ================= */
export interface MarkerDefinition {
  start: string;       // '[LANG:'
  end: string;         // ']'
  singleUse?: boolean; // Ako true, emit samo prvi put
}

export interface ParsedEvent {
  type: 'text' | 'marker';
  value: string;
  markerType?: string; // 🔥 Npr. 'LANG', 'SYSTEM_CALL'
}

enum ParseState {
  Normal,
  MarkerStart,
  MarkerReading
}

/* ================= PARSER ================= */
@Injectable({
  providedIn: 'root',
})
export class StreamParser {
  private destroyRef = inject(DestroyRef);
  private state = ParseState.Normal;
  private buffer = '';
  private activeMarker?: MarkerDefinition;
  private usedMarkers = new Set<string>();
  private output$ = new Subject<ParsedEvent>();
  private _markers: MarkerDefinition[] = [];

  constructor() {
    // 🔥 Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.output$.complete();
    });
  }

  /* ========= PUBLIC API ========= */
  
  feed(chunk: string): void {
    for (const char of chunk) {
      this.processChar(char);
    }
  }

  stream(): Observable<ParsedEvent> {
    return this.output$.asObservable();
  }

  setMarkers(markers: MarkerDefinition[]): void {
    this._markers = markers;
  }

  reset(): void {
    this.state = ParseState.Normal;
    this.buffer = '';
    this.activeMarker = undefined;
    this.usedMarkers.clear();
  }

  /* ========= INTERNAL ========= */
  
  private processChar(char: string): void {
    switch (this.state) {
      case ParseState.Normal:
        if (char === '[') {
          this.state = ParseState.MarkerStart;
          this.buffer = '[';
        } else {
          this.emitText(char);
        }
        break;

      case ParseState.MarkerStart:
        this.buffer += char;
        
        // 🔥 Proveri da li buffer match-uje neki marker start
        const possible = this._markers.filter(m =>
          m.start.startsWith(this.buffer)
        );

        if (!possible.length) {
          // Nije marker - emit kao text
          this.emitText(this.buffer);
          this.resetState();
        } else {
          // 🔥 Potpuni match
          const exactMatch = possible.find(m => m.start === this.buffer);
          if (exactMatch) {
            this.activeMarker = exactMatch;
            this.state = ParseState.MarkerReading;
          }
          // Inače nastavi da čita (partial match)
        }
        break;

      case ParseState.MarkerReading:
        this.buffer += char;
        
        if (char === this.activeMarker!.end) {
          // 🔥 Marker završen
          const value = this.buffer
            .replace(this.activeMarker!.start, '')
            .replace(this.activeMarker!.end, '');
          
          const markerKey = this.activeMarker!.start;
          
          // 🔥 Emit ako nije singleUse ili ako nije već korišćen
          if (
            !this.activeMarker!.singleUse ||
            !this.usedMarkers.has(markerKey)
          ) {
            this.output$.next({
              type: 'marker',
              value,
              markerType: this.extractMarkerType(markerKey)
            });
            
            if (this.activeMarker!.singleUse) {
              this.usedMarkers.add(markerKey);
            }
          }
          
          this.resetState();
        }
        // Inače nastavi da čita
        break;
    }
  }

  private emitText(text: string): void {
    if (text) {
      this.output$.next({ type: 'text', value: text });
    }
  }

  private resetState(): void {
    this.state = ParseState.Normal;
    this.buffer = '';
    this.activeMarker = undefined;
  }

  // 🔥 Ekstrakcija tipa markera iz start stringa
  private extractMarkerType(start: string): string {
    // '[LANG:' → 'LANG'
    // '[SYSTEM_CALL:' → 'SYSTEM_CALL'
    return start.replace('[', '').replace(':', '');
  }
}