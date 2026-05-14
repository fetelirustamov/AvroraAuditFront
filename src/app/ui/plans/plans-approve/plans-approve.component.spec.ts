import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansApproveComponent } from './plans-approve.component';

describe('PlansApproveComponent', () => {
  let component: PlansApproveComponent;
  let fixture: ComponentFixture<PlansApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlansApproveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlansApproveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
