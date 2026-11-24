import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanCreateComponent } from './plan-create.component';
import { appTestProviders } from '../../../../../testing/test-providers';

describe('PlanCreateComponent', () => {
  let component: PlanCreateComponent;
  let fixture: ComponentFixture<PlanCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [PlanCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
