import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionApproveComponent } from './inspection-approve.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('InspectionsApproveComponent', () => {
  let component: InspectionApproveComponent;
  let fixture: ComponentFixture<InspectionApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [InspectionApproveComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InspectionApproveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
