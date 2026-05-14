import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisruptionMiddleComponent } from './disruption-middle.component';

describe('DisruptionMiddleComponent', () => {
  let component: DisruptionMiddleComponent;
  let fixture: ComponentFixture<DisruptionMiddleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisruptionMiddleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisruptionMiddleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
