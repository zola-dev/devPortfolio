import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundMusic } from './background-music';

describe('BackgroundMusic', () => {
  let component: BackgroundMusic;
  let fixture: ComponentFixture<BackgroundMusic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackgroundMusic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackgroundMusic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
