import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanActionsComponent } from './plan-actions.component';

describe('PlanActionsComponent', () => {
  let component: PlanActionsComponent;
  let fixture: ComponentFixture<PlanActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
