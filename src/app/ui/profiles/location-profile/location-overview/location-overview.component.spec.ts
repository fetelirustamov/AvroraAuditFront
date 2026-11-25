import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationOverviewComponent } from './location-overview.component';

describe('LocationOverviewComponent', () => {
  let component: LocationOverviewComponent;
  let fixture: ComponentFixture<LocationOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', {
      locationName: 'Mağaza', locationCode: 4335, summaries: [], avgPlanResult: 0,
      totalDiscrepancies: 0, solved: 0, open: 0, lastInspectionDate: null,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
