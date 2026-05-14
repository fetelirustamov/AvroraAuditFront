import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanCheckedComponent } from './plan-checked.component';

describe('PlanCheckedComponent', () => {
  let component: PlanCheckedComponent;
  let fixture: ComponentFixture<PlanCheckedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanCheckedComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PlanCheckedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
