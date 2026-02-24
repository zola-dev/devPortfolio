import { TestBed } from '@angular/core/testing';

import { UserInteraction } from './user-interaction';

describe('UserInteraction', () => {
  let service: UserInteraction;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserInteraction);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
