import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionSectionComponent } from './inspection-section.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('InspectionSectionComponent', () => {
  let component: InspectionSectionComponent;
  let fixture: ComponentFixture<InspectionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [InspectionSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
