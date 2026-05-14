import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisruptionMiddleDetailsComponent } from './disruption-middle-details.component';

describe('DisruptionMiddleDetailsComponent', () => {
  let component: DisruptionMiddleDetailsComponent;
  let fixture: ComponentFixture<DisruptionMiddleDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisruptionMiddleDetailsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DisruptionMiddleDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
