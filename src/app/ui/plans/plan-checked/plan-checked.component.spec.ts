import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanCheckedComponent } from './plan-checked.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('PlanCheckedComponent', () => {
  let component: PlanCheckedComponent;
  let fixture: ComponentFixture<PlanCheckedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
