import { TestBed } from '@angular/core/testing';

import { UpdateApp } from './update-app';

describe('UpdateApp', () => {
  let service: UpdateApp;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateApp);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
