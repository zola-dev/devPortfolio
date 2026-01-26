import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantComponent } from './assistant';

describe('AssistantComponent', () => {
  let component: AssistantComponent;
  let fixture: ComponentFixture<AssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssistantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssistantComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
