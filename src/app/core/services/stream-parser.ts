import { Injectable, DestroyRef, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/* ================= TYPES ================= */
export interface MarkerDefinition {
  start: string;
  end: string;
  singleUse?: boolean;
}

export interface ParsedEvent {
  type: 'text' | 'marker';
  value: string;
  markerType?: string;
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
    this.destroyRef.onDestroy(() => {
      this.output$.complete();
    });
  }

  /* ========= PUBLIC API ========= */
  
  feed(chunk: string): void {
    console.log('🔵 Parser.feed() received chunk:', JSON.stringify(chunk)); 
    
    for (const char of chunk) {
      this.processChar(char);
    }
  }

  stream(): Observable<ParsedEvent> {
    return this.output$.asObservable();
  }

  setMarkers(markers: MarkerDefinition[]): void {
    this._markers = markers;
    console.log('🔵 Parser markers set:', markers); 
  }

  reset(): void {
    console.log('🔵 Parser.reset()'); 
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
          console.log('🟡 Found "[" - switching to MarkerStart');
          this.state = ParseState.MarkerStart;
          this.buffer = '[';
        } else {
          this.emitText(char);
        }
        break;

      case ParseState.MarkerStart:
        this.buffer += char;
        console.log('🟡 MarkerStart buffer:', JSON.stringify(this.buffer)); 
        
        const possible = this._markers.filter(m =>
          m.start.startsWith(this.buffer)
        );
        
        console.log('🟡 Possible markers:', possible.length); 

        if (!possible.length) {
          console.log('🔴 No possible markers - emitting as text'); 
          this.emitText(this.buffer);
          this.resetState();
        } else {
          const exactMatch = possible.find(m => m.start === this.buffer);
          if (exactMatch) {
            console.log('🟢 Exact marker match:', exactMatch.start); 
            this.activeMarker = exactMatch;
            this.state = ParseState.MarkerReading;
          } else {
            console.log('🟡 Partial match, continuing...'); 
          }
        }
        break;

      case ParseState.MarkerReading:
        this.buffer += char;
        console.log('🟣 MarkerReading buffer:', JSON.stringify(this.buffer)); 
        
        if (char === this.activeMarker!.end) {
          const value = this.buffer
            .replace(this.activeMarker!.start, '')
            .replace(this.activeMarker!.end, '');
          
          const markerKey = this.activeMarker!.start;
          
          console.log('🟢 Marker complete! Value:', JSON.stringify(value)); 
          console.log('🟢 Marker key:', markerKey); 
          console.log('🟢 SingleUse:', this.activeMarker!.singleUse); 
          console.log('🟢 Already used:', this.usedMarkers.has(markerKey)); 
          
          if (
            !this.activeMarker!.singleUse ||
            !this.usedMarkers.has(markerKey)
          ) {
            const event = {
              type: 'marker' as const,
              value,
              markerType: this.extractMarkerType(markerKey)
            };
            
            console.log('🟢 Emitting marker event:', event); 
            this.output$.next(event);
            
            if (this.activeMarker!.singleUse) {
              this.usedMarkers.add(markerKey);
              console.log('🟢 Marked as used'); 
            }
          } else {
            console.log('🔴 Marker already used, skipping'); 
          }
          
          this.resetState();
        }
        break;
    }
  }

  private emitText(text: string): void {
    if (text) {
      console.log('📝 Emitting text:', JSON.stringify(text)); 
      this.output$.next({ type: 'text', value: text });
    }
  }

  private resetState(): void {
    console.log('🔵 resetState()'); 
    this.state = ParseState.Normal;
    this.buffer = '';
    this.activeMarker = undefined;
  }

  private extractMarkerType(start: string): string {
    const type = start.replace('[', '').replace(':', '');
    console.log('🔵 extractMarkerType:', start, '→', type); 
    return type;
  }
}

