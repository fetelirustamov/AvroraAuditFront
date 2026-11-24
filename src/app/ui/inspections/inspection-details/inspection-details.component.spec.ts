import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionDetailsComponent } from './inspection-details.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('InspectionDetailsComponent', () => {
  let component: InspectionDetailsComponent;
  let fixture: ComponentFixture<InspectionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [InspectionDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
