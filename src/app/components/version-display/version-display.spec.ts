import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionDisplay } from './version-display';

describe('VersionDisplay', () => {
  let component: VersionDisplay;
  let fixture: ComponentFixture<VersionDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VersionDisplay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
