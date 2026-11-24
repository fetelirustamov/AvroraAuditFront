import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansApproveComponent } from './plans-approve.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('PlansApproveComponent', () => {
  let component: PlansApproveComponent;
  let fixture: ComponentFixture<PlansApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
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
