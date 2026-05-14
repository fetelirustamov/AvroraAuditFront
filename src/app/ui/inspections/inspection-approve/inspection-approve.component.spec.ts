import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionApproveComponent } from './inspection-approve.component';

describe('InspectionsApproveComponent', () => {
  let component: InspectionApproveComponent;
  let fixture: ComponentFixture<InspectionApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
