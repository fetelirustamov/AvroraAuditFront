import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanInfoSectionComponent } from './plan-info-section.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('PlanInfoSectionComponent', () => {
  let component: PlanInfoSectionComponent;
  let fixture: ComponentFixture<PlanInfoSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
