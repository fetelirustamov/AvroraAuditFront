import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanUserListComponent } from './plan-user-list.component';

describe('PlanUserListComponent', () => {
  let component: PlanUserListComponent;
  let fixture: ComponentFixture<PlanUserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanUserListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanUserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
