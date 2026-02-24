import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitHistory } from './commit-history';

describe('CommitHistory', () => {
  let component: CommitHistory;
  let fixture: ComponentFixture<CommitHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
