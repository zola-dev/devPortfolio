import { TestBed } from '@angular/core/testing';

import { BackgroundMusic } from './background-music';

describe('BackgroundMusic', () => {
  let service: BackgroundMusic;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackgroundMusic);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
