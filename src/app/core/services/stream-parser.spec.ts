import { TestBed } from '@angular/core/testing';

import { StreamParser } from './stream-parser';

describe('StreamParser', () => {
  let service: StreamParser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StreamParser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
