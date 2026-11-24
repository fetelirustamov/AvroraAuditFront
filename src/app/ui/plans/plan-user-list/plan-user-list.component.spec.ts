import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanUserListComponent } from './plan-user-list.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('PlanUserListComponent', () => {
  let component: PlanUserListComponent;
  let fixture: ComponentFixture<PlanUserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
