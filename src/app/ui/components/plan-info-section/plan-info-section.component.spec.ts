import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanInfoSectionComponent } from './plan-info-section.component';

describe('PlanInfoSectionComponent', () => {
  let component: PlanInfoSectionComponent;
  let fixture: ComponentFixture<PlanInfoSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanInfoSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanInfoSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
